import Foundation
import PresenceCore
import SwiftUI

struct ContentView: View {
    @ObservedObject var controller: PresenceController

    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.98, green: 0.95, blue: 0.90), Color(red: 0.94, green: 0.97, blue: 1.0)], startPoint: .topLeading, endPoint: .bottomTrailing)
                .ignoresSafeArea()
            Circle()
                .fill(Color.pink.opacity(0.16))
                .frame(width: 300, height: 300)
                .blur(radius: 28)
                .offset(x: -260, y: -210)
            Circle()
                .fill(Color.cyan.opacity(0.16))
                .frame(width: 260, height: 260)
                .blur(radius: 26)
                .offset(x: 300, y: 230)

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HeaderPanel(controller: controller)
                    HStack(alignment: .top, spacing: 18) {
                        SettingsPanel(controller: controller)
                        SnapshotPanel(controller: controller)
                    }
                    PayloadPanel(payload: controller.lastPayload, error: controller.lastError)
                }
                .padding(24)
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    controller.toggle()
                } label: {
                    Label(controller.isRunning ? "Stop" : "Start", systemImage: controller.isRunning ? "stop.fill" : "play.fill")
                }
                .disabled(!controller.canStart)
            }
        }
    }
}

struct HeaderPanel: View {
    @ObservedObject var controller: PresenceController

    var body: some View {
        HStack(alignment: .center, spacing: 18) {
            ZStack {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(controller.isRunning ? Color.green.opacity(0.16) : Color.gray.opacity(0.14))
                Image(systemName: controller.isRunning ? "dot.radiowaves.left.and.right" : "moon.zzz.fill")
                    .font(.system(size: 30, weight: .semibold))
                    .foregroundStyle(controller.isRunning ? .green : .secondary)
            }
            .frame(width: 74, height: 74)

            VStack(alignment: .leading, spacing: 7) {
                Text("Presence Probe")
                    .font(.system(size: 34, weight: .bold, design: .rounded))
                Text("Send local activity, editor state, and device health to your Next.js page.")
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 10) {
                StatusBadge(isRunning: controller.isRunning)
                Text(controller.lastSentAt.map { "Last sent \($0.formatted(date: .omitted, time: .standard))" } ?? "Waiting to report")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .panelStyle()
    }
}

struct SettingsPanel: View {
    @ObservedObject var controller: PresenceController

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            PanelTitle("Configuration", systemImage: "slider.horizontal.3")
            FieldRow("Target URL") {
                TextField("http://localhost:3000/api/presence", text: $controller.endpointText)
                    .textFieldStyle(.roundedBorder)
            }
            FieldRow("Repo Root") {
                HStack {
                    TextField("Project folder", text: $controller.repoRoot)
                        .textFieldStyle(.roundedBorder)
                    Button("Choose") {
                        controller.chooseRepoRoot()
                    }
                }
            }
            FieldRow("Province") {
                Picker("Province", selection: $controller.location) {
                    ForEach(controller.locationOptions, id: \.self) { location in
                        Text(location).tag(location)
                    }
                }
                .labelsHidden()
                .pickerStyle(.menu)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            FieldRow("Device Name") {
                TextField("snowball's Mac", text: $controller.deviceName)
                    .textFieldStyle(.roundedBorder)
            }
            FieldRow("Interval") {
                HStack {
                    TextField("10", text: $controller.intervalText)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 84)
                    Text("seconds")
                        .foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 12) {
                Button {
                    controller.toggle()
                } label: {
                    Label(controller.isRunning ? "Stop Reporting" : "Start Reporting", systemImage: controller.isRunning ? "stop.fill" : "play.fill")
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(!controller.canStart)

                Button {
                    controller.refreshPreview()
                } label: {
                    Label("Refresh", systemImage: "arrow.clockwise")
                }
                .controlSize(.large)
            }
            .padding(.top, 4)
        }
        .panelStyle()
        .frame(minWidth: 420)
    }
}

struct SnapshotPanel: View {
    @ObservedObject var controller: PresenceController

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            PanelTitle("Current Snapshot", systemImage: "waveform.path.ecg")
            MetricTile(title: "App", value: controller.lastPayload?.activeApp?.name ?? "Unknown", symbol: "macwindow")
            MetricTile(title: "Editor", value: editorLine(controller.lastPayload?.editing), symbol: "pencil.and.outline")
            MetricTile(title: "Device", value: controller.lastPayload?.device?.name ?? "Mac", symbol: "desktopcomputer")
            MetricTile(title: "Health", value: metricLine(cpu: controller.lastPayload?.device?.cpuUsagePercent, memory: controller.lastPayload?.device?.memoryUsedPercent), symbol: "cpu")
        }
        .panelStyle()
        .frame(minWidth: 300, maxWidth: 340)
    }
}

struct PayloadPanel: View {
    let payload: PresencePayload?
    let error: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            PanelTitle("Payload", systemImage: "curlybraces")
            if let error {
                Label(error, systemImage: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
            }
            LazyVGrid(columns: [GridItem(.fixed(96), alignment: .leading), GridItem(.flexible(), alignment: .leading)], alignment: .leading, spacing: 10) {
                PayloadCell("Status", payload?.status ?? "unknown")
                PayloadCell("Province", payload?.location ?? "unknown")
                PayloadCell("Device", payload?.device?.name ?? "unknown")
                PayloadCell("OS", payload?.device?.os ?? "unknown")
                PayloadCell("CPU", formatPercent(payload?.device?.cpuUsagePercent))
                PayloadCell("Memory", memoryLine(payload?.device))
                PayloadCell("App", payload?.activeApp?.name ?? "unknown")
                PayloadCell("Window", payload?.activeApp?.windowTitle ?? "none")
                PayloadCell("File", payload?.editing?.isEditor == true ? (payload?.editing?.file ?? "none") : "none")
                PayloadCell("Branch", payload?.editing?.branch ?? "")
            }
            .font(.system(.body, design: .monospaced))
        }
        .panelStyle()
    }
}

struct FieldRow<Content: View>: View {
    let label: String
    @ViewBuilder let content: Content

    init(_ label: String, @ViewBuilder content: () -> Content) {
        self.label = label
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
            content
        }
    }
}

struct PanelTitle: View {
    let title: String
    let systemImage: String

    init(_ title: String, systemImage: String) {
        self.title = title
        self.systemImage = systemImage
    }

    var body: some View {
        Label(title, systemImage: systemImage)
            .font(.title3.weight(.bold))
    }
}

struct MetricTile: View {
    let title: String
    let value: String
    let symbol: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: symbol)
                .frame(width: 28, height: 28)
                .foregroundStyle(.purple)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(value)
                    .lineLimit(2)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct PayloadCell: View {
    let label: String
    let value: String

    init(_ label: String, _ value: String) {
        self.label = label
        self.value = value
    }

    var body: some View {
        Text(label)
            .foregroundStyle(.secondary)
        Text(value)
            .textSelection(.enabled)
            .lineLimit(2)
    }
}

struct StatusBadge: View {
    let isRunning: Bool

    var body: some View {
        Label(isRunning ? "Reporting" : "Idle", systemImage: isRunning ? "checkmark.circle.fill" : "pause.circle")
            .font(.headline)
            .foregroundStyle(isRunning ? .green : .secondary)
            .padding(.horizontal, 14)
            .padding(.vertical, 9)
            .background(.thinMaterial, in: Capsule())
    }
}

extension View {
    func panelStyle() -> some View {
        padding(22)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 26, style: .continuous)
                    .stroke(.white.opacity(0.54), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.08), radius: 24, y: 12)
    }
}

func editorLine(_ editing: EditingPayload?) -> String {
    guard editing?.isEditor == true else {
        return "Not editing"
    }
    return [editing?.file, editing?.branch].compactMap { value in
        guard let value, !value.isEmpty else { return nil }
        return value
    }.joined(separator: " · ")
}

func metricLine(cpu: Double?, memory: Double?) -> String {
    "CPU \(formatPercent(cpu)) · MEM \(formatPercent(memory))"
}

func formatPercent(_ value: Double?) -> String {
    guard let value else { return "n/a" }
    return "\(String(format: "%.1f", value))%"
}

func memoryLine(_ device: DevicePayload?) -> String {
    guard let used = device?.memoryUsedGB, let total = device?.memoryTotalGB else {
        return "Memory n/a"
    }
    return "\(String(format: "%.1f", used)) / \(String(format: "%.1f", total)) GB"
}
