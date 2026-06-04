// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "macos-presence-probe",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "PresenceProbe", targets: ["PresenceProbe"]),
        .executable(name: "PresenceProbeApp", targets: ["PresenceProbeApp"])
    ],
    targets: [
        .target(name: "PresenceCore"),
        .executableTarget(name: "PresenceProbe", dependencies: ["PresenceCore"]),
        .executableTarget(name: "PresenceProbeApp", dependencies: ["PresenceCore"])
    ]
)
