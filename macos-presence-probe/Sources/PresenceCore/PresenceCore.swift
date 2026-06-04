import AppKit
import CoreGraphics
import Foundation

public struct PresenceConfig: Equatable {
    public var endpoint: URL
    public var interval: TimeInterval
    public var location: String
    public var repoRoot: String
    public var deviceName: String

    public init(
        endpoint: URL = URL(string: "http://localhost:3000/api/presence")!,
        interval: TimeInterval = 10,
        location: String = "Shanghai",
        repoRoot: String = defaultRepoRoot(),
        deviceName: String = Host.current().localizedName ?? "Mac"
    ) {
        self.endpoint = endpoint
        self.interval = interval
        self.location = location
        self.repoRoot = repoRoot
        self.deviceName = deviceName
    }
}

public struct ActiveAppPayload: Codable, Equatable {
    public let name: String
    public let bundleIdentifier: String?
    public let windowTitle: String?

    public init(name: String, bundleIdentifier: String?, windowTitle: String?) {
        self.name = name
        self.bundleIdentifier = bundleIdentifier
        self.windowTitle = windowTitle
    }
}

public struct EditingPayload: Codable, Equatable {
    public let isEditor: Bool
    public let editor: String?
    public let file: String?
    public let workspace: String?
    public let branch: String?

    public init(isEditor: Bool, editor: String?, file: String?, workspace: String?, branch: String?) {
        self.isEditor = isEditor
        self.editor = editor
        self.file = file
        self.workspace = workspace
        self.branch = branch
    }
}

public struct PresencePayload: Codable, Equatable {
    public let status: String
    public let location: String
    public let bpm: Int
    public let device: DevicePayload?
    public let activeApp: ActiveAppPayload?
    public let editing: EditingPayload?
    public let sentAt: String

    public init(
        status: String,
        location: String,
        bpm: Int,
        device: DevicePayload?,
        activeApp: ActiveAppPayload?,
        editing: EditingPayload?,
        sentAt: String
    ) {
        self.status = status
        self.location = location
        self.bpm = bpm
        self.device = device
        self.activeApp = activeApp
        self.editing = editing
        self.sentAt = sentAt
    }
}

public struct DevicePayload: Codable, Equatable {
    public let name: String
    public let os: String
    public let cpuUsagePercent: Double?
    public let memoryUsedPercent: Double?
    public let memoryUsedGB: Double?
    public let memoryTotalGB: Double?

    public init(
        name: String,
        os: String,
        cpuUsagePercent: Double?,
        memoryUsedPercent: Double?,
        memoryUsedGB: Double?,
        memoryTotalGB: Double?
    ) {
        self.name = name
        self.os = os
        self.cpuUsagePercent = cpuUsagePercent
        self.memoryUsedPercent = memoryUsedPercent
        self.memoryUsedGB = memoryUsedGB
        self.memoryTotalGB = memoryTotalGB
    }
}

public final class PresenceReporter {
    private let encoder = JSONEncoder()

    public init() {
        encoder.outputFormatting = [.sortedKeys]
    }

    public func send(_ payload: PresencePayload, endpoint: URL) async throws {
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(payload)

        let (_, response) = try await URLSession.shared.data(for: request)
        if let httpResponse = response as? HTTPURLResponse, !(200..<300).contains(httpResponse.statusCode) {
            throw PresenceError.badStatus(httpResponse.statusCode)
        }
    }
}

public enum PresenceError: LocalizedError {
    case badStatus(Int)

    public var errorDescription: String? {
        switch self {
        case .badStatus(let statusCode):
            return "Server returned HTTP \(statusCode)."
        }
    }
}

public func snapshot(status: String, config: PresenceConfig) -> PresencePayload {
    let app = NSWorkspace.shared.frontmostApplication
    let windowTitle = app.flatMap { frontWindowTitle(processIdentifier: $0.processIdentifier) }
    let appPayload = app.map {
        ActiveAppPayload(name: $0.localizedName ?? "Unknown", bundleIdentifier: $0.bundleIdentifier, windowTitle: windowTitle)
    }

    return PresencePayload(
        status: status,
        location: config.location,
        bpm: status == "online" ? 72 + Int.random(in: -3...4) : 0,
        device: devicePayload(deviceName: config.deviceName),
        activeApp: appPayload,
        editing: editingPayload(appName: app?.localizedName, bundleIdentifier: app?.bundleIdentifier, windowTitle: windowTitle, repoRoot: config.repoRoot),
        sentAt: ISO8601DateFormatter().string(from: Date())
    )
}

public func editingPayload(appName: String?, bundleIdentifier: String?, windowTitle: String?, repoRoot: String) -> EditingPayload {
    let name = appName ?? "Unknown"
    let bundle = bundleIdentifier ?? ""
    let isEditor = bundle.contains("com.microsoft.VSCode")
        || bundle.contains("com.todesktop.230313mzl4w4u92")
        || bundle.contains("com.apple.dt.Xcode")
        || name.localizedCaseInsensitiveContains("Code")
        || name.localizedCaseInsensitiveContains("Cursor")
        || name.localizedCaseInsensitiveContains("Xcode")

    guard isEditor else {
        return EditingPayload(isEditor: false, editor: name, file: name, workspace: nil, branch: nil)
    }

    let parsed = parseEditorTitle(windowTitle)
    let file = parsed.file.flatMap { resolveFile(named: $0, repoRoot: repoRoot) } ?? parsed.file ?? windowTitle ?? name

    return EditingPayload(
        isEditor: true,
        editor: name,
        file: file,
        workspace: parsed.workspace,
        branch: currentGitBranch(repoRoot: repoRoot)
    )
}

public func devicePayload(deviceName: String) -> DevicePayload {
    let memory = memoryStats()
    return DevicePayload(
        name: deviceName.isEmpty ? (Host.current().localizedName ?? "Mac") : deviceName,
        os: "\(ProcessInfo.processInfo.operatingSystemVersionString)",
        cpuUsagePercent: cpuUsagePercent(),
        memoryUsedPercent: memory.usedPercent,
        memoryUsedGB: memory.usedGB,
        memoryTotalGB: memory.totalGB
    )
}

func cpuUsagePercent() -> Double? {
    guard let output = runCommand("/usr/bin/top", arguments: ["-l", "1", "-n", "0", "-s", "0"]) else {
        return nil
    }

    guard let line = output.components(separatedBy: .newlines).first(where: { $0.contains("CPU usage:") }) else {
        return nil
    }

    let values = line
        .replacingOccurrences(of: "%", with: "")
        .components(separatedBy: CharacterSet(charactersIn: ","))
        .compactMap { part -> Double? in
            let tokens = part.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
            return tokens.compactMap(Double.init).first
        }

    guard values.count >= 2 else {
        return nil
    }

    return rounded(values[0] + values[1])
}

func memoryStats() -> (usedPercent: Double?, usedGB: Double?, totalGB: Double?) {
    guard let output = runCommand("/usr/bin/vm_stat", arguments: []) else {
        return (nil, nil, rounded(Double(ProcessInfo.processInfo.physicalMemory) / 1_073_741_824))
    }

    let pageSize = 16_384.0
    var pages: [String: Double] = [:]

    for line in output.components(separatedBy: .newlines) {
        let parts = line.components(separatedBy: ":")
        guard parts.count == 2 else { continue }
        let key = parts[0]
        let value = parts[1].filter { $0.isNumber }
        if let number = Double(value) {
            pages[key] = number
        }
    }

    let active = pages["Pages active"] ?? 0
    let wired = pages["Pages wired down"] ?? 0
    let compressed = pages["Pages occupied by compressor"] ?? 0
    let usedBytes = (active + wired + compressed) * pageSize
    let totalBytes = Double(ProcessInfo.processInfo.physicalMemory)
    guard totalBytes > 0 else {
        return (nil, nil, nil)
    }

    return (
        rounded((usedBytes / totalBytes) * 100),
        rounded(usedBytes / 1_073_741_824),
        rounded(totalBytes / 1_073_741_824)
    )
}

func runCommand(_ path: String, arguments: [String]) -> String? {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: path)
    process.arguments = arguments

    let pipe = Pipe()
    process.standardOutput = pipe
    process.standardError = Pipe()

    do {
        try process.run()
        process.waitUntilExit()
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        return String(data: data, encoding: .utf8)
    } catch {
        return nil
    }
}

func rounded(_ value: Double) -> Double {
    (value * 10).rounded() / 10
}

public func parseEditorTitle(_ title: String?) -> (file: String?, workspace: String?) {
    guard let title, !title.isEmpty else {
        return (nil, nil)
    }

    let cleaned = title
        .replacingOccurrences(of: "●", with: "")
        .trimmingCharacters(in: .whitespacesAndNewlines)

    let separators = [" — ", " – ", " - "]
    for separator in separators {
        let parts = cleaned.components(separatedBy: separator).map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        if parts.count >= 2 {
            return (parts[0], parts[1])
        }
    }

    return (cleaned, nil)
}

public func resolveFile(named fileName: String, repoRoot: String) -> String? {
    let ignored = ["/node_modules/", "/.next/", "/.git/", "/macos-presence-probe/.build/"]
    let rootURL = URL(fileURLWithPath: repoRoot)
    guard let enumerator = FileManager.default.enumerator(at: rootURL, includingPropertiesForKeys: [.isRegularFileKey]) else {
        return nil
    }

    for case let url as URL in enumerator {
        let path = url.path
        if ignored.contains(where: { path.contains($0) }) {
            enumerator.skipDescendants()
            continue
        }
        if url.lastPathComponent == fileName {
            return path.replacingOccurrences(of: "\(repoRoot)/", with: "")
        }
    }

    return nil
}

public func frontWindowTitle(processIdentifier: pid_t) -> String? {
    let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
    guard let windows = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
        return nil
    }

    for window in windows {
        guard
            let ownerPID = window[kCGWindowOwnerPID as String] as? pid_t,
            ownerPID == processIdentifier,
            let layer = window[kCGWindowLayer as String] as? Int,
            layer == 0
        else {
            continue
        }

        return window[kCGWindowName as String] as? String
    }

    return nil
}

public func currentGitBranch(repoRoot: String) -> String? {
    let process = Process()
    process.executableURL = URL(fileURLWithPath: "/usr/bin/git")
    process.arguments = ["-C", repoRoot, "rev-parse", "--abbrev-ref", "HEAD"]

    let pipe = Pipe()
    process.standardOutput = pipe
    process.standardError = Pipe()

    do {
        try process.run()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            return nil
        }
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        return String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
    } catch {
        return nil
    }
}

public func defaultRepoRoot() -> String {
    let cwd = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
    if cwd.lastPathComponent == "macos-presence-probe" {
        return cwd.deletingLastPathComponent().path
    }
    return cwd.path
}
