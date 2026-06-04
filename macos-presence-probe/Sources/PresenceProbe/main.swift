import Foundation
import PresenceCore

@main
struct PresenceProbe {
    static func main() async {
        let config = parseArguments()
        let reporter = PresenceReporter()

        installExitHandlers(config: config, reporter: reporter)

        while true {
            do {
                try await reporter.send(snapshot(status: "online", config: config), endpoint: config.endpoint)
            } catch {
                fputs("PresenceProbe send failed: \(error.localizedDescription)\n", stderr)
            }
            try? await Task.sleep(nanoseconds: UInt64(config.interval * 1_000_000_000))
        }
    }
}

func parseArguments() -> PresenceConfig {
    var config = PresenceConfig()
    var args = CommandLine.arguments.dropFirst()

    while let arg = args.first {
        args = args.dropFirst()
        switch arg {
        case "--endpoint":
            if let value = args.first, let url = URL(string: value) {
                config.endpoint = url
                args = args.dropFirst()
            }
        case "--interval":
            if let value = args.first, let interval = TimeInterval(value) {
                config.interval = interval
                args = args.dropFirst()
            }
        case "--location":
            if let value = args.first {
                config.location = value
                args = args.dropFirst()
            }
        case "--repo-root":
            if let value = args.first {
                config.repoRoot = NSString(string: value).expandingTildeInPath
                args = args.dropFirst()
            }
        case "--device-name":
            if let value = args.first {
                config.deviceName = value
                args = args.dropFirst()
            }
        default:
            break
        }
    }

    return config
}

func installExitHandlers(config: PresenceConfig, reporter: PresenceReporter) {
    signal(SIGINT, SIG_IGN)
    signal(SIGTERM, SIG_IGN)

    let sigint = DispatchSource.makeSignalSource(signal: SIGINT, queue: .main)
    sigint.setEventHandler {
        Task {
            try? await reporter.send(snapshot(status: "offline", config: config), endpoint: config.endpoint)
            exit(0)
        }
    }
    sigint.resume()

    let sigterm = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .main)
    sigterm.setEventHandler {
        Task {
            try? await reporter.send(snapshot(status: "offline", config: config), endpoint: config.endpoint)
            exit(0)
        }
    }
    sigterm.resume()
}
