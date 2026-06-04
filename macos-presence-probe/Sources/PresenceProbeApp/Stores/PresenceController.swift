import AppKit
import Combine
import Foundation
import PresenceCore

@MainActor
final class PresenceController: ObservableObject {
    static let shared = PresenceController()

    @Published var endpointText: String {
        didSet { defaults.set(endpointText, forKey: Keys.endpoint) }
    }
    @Published var repoRoot: String {
        didSet { defaults.set(repoRoot, forKey: Keys.repoRoot) }
    }
    @Published var location: String {
        didSet { defaults.set(location, forKey: Keys.location) }
    }
    @Published var deviceName: String {
        didSet { defaults.set(deviceName, forKey: Keys.deviceName) }
    }
    @Published var intervalText: String {
        didSet { defaults.set(intervalText, forKey: Keys.interval) }
    }
    @Published private(set) var isRunning = false
    @Published private(set) var lastPayload: PresencePayload?
    @Published private(set) var lastSentAt: Date?
    @Published private(set) var lastError: String?

    private let defaults = UserDefaults.standard
    private let reporter = PresenceReporter()
    private var reportingTask: Task<Void, Never>?

    private enum Keys {
        static let endpoint = "presence.endpoint"
        static let repoRoot = "presence.repoRoot"
        static let location = "presence.location"
        static let interval = "presence.interval"
        static let deviceName = "presence.deviceName"
    }

    let locationOptions = [
        "Beijing", "Tianjin", "Hebei", "Shanxi", "Inner Mongolia", "Liaoning", "Jilin", "Heilongjiang",
        "Shanghai", "Jiangsu", "Zhejiang", "Anhui", "Fujian", "Jiangxi", "Shandong", "Henan",
        "Hubei", "Hunan", "Guangdong", "Guangxi", "Hainan", "Chongqing", "Sichuan", "Guizhou",
        "Yunnan", "Tibet", "Shaanxi", "Gansu", "Qinghai", "Ningxia", "Xinjiang",
        "Hong Kong", "Macau", "Taiwan"
    ]

    init() {
        endpointText = defaults.string(forKey: Keys.endpoint) ?? "http://localhost:3000/api/presence"
        repoRoot = defaults.string(forKey: Keys.repoRoot) ?? defaultRepoRoot()
        location = defaults.string(forKey: Keys.location) ?? "Shanghai"
        deviceName = defaults.string(forKey: Keys.deviceName) ?? (Host.current().localizedName ?? "Mac")
        intervalText = defaults.string(forKey: Keys.interval) ?? "10"
        lastPayload = snapshot(status: "online", config: config)
    }

    var config: PresenceConfig {
        PresenceConfig(
            endpoint: URL(string: endpointText) ?? URL(string: "http://localhost:3000/api/presence")!,
            interval: interval,
            location: location.isEmpty ? "Shanghai" : location,
            repoRoot: NSString(string: repoRoot).expandingTildeInPath,
            deviceName: deviceName
        )
    }

    var interval: TimeInterval {
        max(TimeInterval(intervalText) ?? 10, 2)
    }

    var canStart: Bool {
        URL(string: endpointText) != nil && !repoRoot.isEmpty
    }

    func toggle() {
        isRunning ? stop() : start()
    }

    func start() {
        guard !isRunning, canStart else {
            return
        }

        isRunning = true
        lastError = nil

        reportingTask = Task { [weak self] in
            guard let self else { return }
            while !Task.isCancelled {
                await self.send(status: "online")
                try? await Task.sleep(nanoseconds: UInt64(self.interval * 1_000_000_000))
            }
        }
    }

    func stop() {
        reportingTask?.cancel()
        reportingTask = nil
        isRunning = false
        Task { await send(status: "offline") }
    }

    func refreshPreview() {
        lastPayload = snapshot(status: isRunning ? "online" : "offline", config: config)
    }

    func chooseRepoRoot() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.directoryURL = URL(fileURLWithPath: repoRoot)

        if panel.runModal() == .OK, let url = panel.url {
            repoRoot = url.path
            refreshPreview()
        }
    }

    private func send(status: String) async {
        let currentConfig = config
        let payload = snapshot(status: status, config: currentConfig)
        lastPayload = payload

        do {
            try await reporter.send(payload, endpoint: currentConfig.endpoint)
            lastSentAt = Date()
            lastError = nil
        } catch {
            lastError = error.localizedDescription
        }
    }

    deinit {
        reportingTask?.cancel()
    }
}
