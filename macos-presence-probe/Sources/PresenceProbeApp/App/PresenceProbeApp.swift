import AppKit
import Combine
import PresenceCore
import SwiftUI

private let reopenNotification = Notification.Name("com.snowball.presence-probe.reopen")

@main
struct PresenceProbeApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var controller = PresenceController.shared

    var body: some Scene {
        WindowGroup("Presence Probe") {
            ContentView(controller: controller)
                .frame(minWidth: 680, minHeight: 520)
        }
        .commands {
            CommandGroup(after: .appInfo) {
                Button(controller.isRunning ? "Stop Reporting" : "Start Reporting") {
                    controller.toggle()
                }
                .keyboardShortcut("r", modifiers: [.command])
            }
        }
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate {
    private let windowDelegate = ProbeWindowDelegate()
    private var statusItem: NSStatusItem?
    private var runningObserver: AnyCancellable?
    private var lockFileDescriptor: Int32 = -1
    private var controller: PresenceController { PresenceController.shared }

    func applicationDidFinishLaunching(_ notification: Notification) {
        guard acquireSingleInstanceLock() else {
            DistributedNotificationCenter.default().post(name: reopenNotification, object: nil)
            NSApp.terminate(nil)
            return
        }

        NSApp.setActivationPolicy(.accessory)
        DistributedNotificationCenter.default().addObserver(
            self,
            selector: #selector(openFromStatusItem),
            name: reopenNotification,
            object: nil
        )
        setupStatusItem()
        runningObserver = controller.$isRunning.sink { [weak self] _ in
            self?.rebuildStatusMenu()
        }
        DispatchQueue.main.async { [weak self] in
            self?.attachWindowDelegates()
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        if lockFileDescriptor >= 0 {
            flock(lockFileDescriptor, LOCK_UN)
            close(lockFileDescriptor)
            lockFileDescriptor = -1
        }
        DistributedNotificationCenter.default().removeObserver(self)
    }

    func applicationDidBecomeActive(_ notification: Notification) {
        attachWindowDelegates()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        showMainWindow()
        return true
    }

    private func setupStatusItem() {
        let item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.imagePosition = .imageOnly
        item.button?.target = self
        item.button?.action = #selector(openFromStatusItem)
        statusItem = item
        rebuildStatusMenu()
    }

    private func rebuildStatusMenu() {
        let menu = NSMenu()
        menu.delegate = self

        let statusMenuItem = NSMenuItem(title: controller.isRunning ? "Status: Running" : "Status: Stopped", action: nil, keyEquivalent: "")
        statusMenuItem.image = NSImage(
            systemSymbolName: controller.isRunning ? "checkmark.circle.fill" : "pause.circle",
            accessibilityDescription: nil
        )
        menu.addItem(statusMenuItem)

        if let payload = controller.lastPayload {
            menu.addItem(disabledItem("Location: \(payload.location)"))
            if let app = payload.activeApp?.name {
                menu.addItem(disabledItem("App: \(app)"))
            }
            if let editing = payload.editing, editing.isEditor, let file = editing.file {
                menu.addItem(disabledItem("Editing: \(file)"))
            }
            if let device = payload.device {
                menu.addItem(disabledItem(systemSummary(from: device)))
            }
        }

        if let lastSentAt = controller.lastSentAt {
            menu.addItem(disabledItem("Last sent: \(relativeTime(from: lastSentAt))"))
        } else {
            menu.addItem(disabledItem("Last sent: Not yet"))
        }

        if let lastError = controller.lastError {
            menu.addItem(disabledItem("Error: \(lastError)"))
        }

        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Open Presence Probe", action: #selector(openFromStatusItem), keyEquivalent: ""))
        menu.addItem(NSMenuItem(title: controller.isRunning ? "Stop Reporting" : "Start Reporting", action: #selector(toggleReporting), keyEquivalent: ""))
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Quit Presence Probe", action: #selector(quitApp), keyEquivalent: "q"))
        menu.items.forEach { $0.target = self }
        statusItem?.menu = menu
        updateStatusIcon()
    }

    nonisolated func menuNeedsUpdate(_ menu: NSMenu) {
        Task { @MainActor in
            controller.refreshPreview()
            rebuildStatusMenu()
        }
    }

    @objc private func openFromStatusItem() {
        showMainWindow()
    }

    @objc private func toggleReporting() {
        controller.toggle()
        rebuildStatusMenu()
    }

    @objc private func quitApp() {
        controller.stop()
        NSApp.terminate(nil)
    }

    private func showMainWindow() {
        attachWindowDelegates()
        if let window = NSApp.windows.first(where: { $0.title == "Presence Probe" }) ?? NSApp.windows.first {
            window.delegate = windowDelegate
            window.orderFrontRegardless()
            window.makeKeyAndOrderFront(nil)
        }
        NSApp.setActivationPolicy(.accessory)
        NSApp.activate(ignoringOtherApps: true)
    }

    private func disabledItem(_ title: String) -> NSMenuItem {
        let item = NSMenuItem(title: title, action: nil, keyEquivalent: "")
        item.isEnabled = false
        return item
    }

    private func systemSummary(from device: DevicePayload) -> String {
        let cpu = device.cpuUsagePercent.map { "CPU \(String(format: "%.1f", $0))%" } ?? "CPU --"
        let memory = device.memoryUsedPercent.map { "MEM \(String(format: "%.1f", $0))%" } ?? "MEM --"
        return "\(device.name) · \(cpu) · \(memory)"
    }

    private func relativeTime(from date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }

    private func updateStatusIcon() {
        let symbolName = controller.isRunning ? "dot.radiowaves.left.and.right" : "pause.circle"
        statusItem?.button?.image = NSImage(systemSymbolName: symbolName, accessibilityDescription: "Presence Probe")
    }

    private func attachWindowDelegates() {
        NSApp.windows.forEach { window in
            window.delegate = windowDelegate
        }
    }

    private func acquireSingleInstanceLock() -> Bool {
        let lockPath = (NSTemporaryDirectory() as NSString).appendingPathComponent("com.snowball.presence-probe.lock")
        let descriptor = open(lockPath, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard descriptor >= 0 else {
            return true
        }

        if flock(descriptor, LOCK_EX | LOCK_NB) == 0 {
            lockFileDescriptor = descriptor
            return true
        }

        close(descriptor)
        return false
    }
}

final class ProbeWindowDelegate: NSObject, NSWindowDelegate {
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        sender.orderOut(nil)
        return false
    }
}
