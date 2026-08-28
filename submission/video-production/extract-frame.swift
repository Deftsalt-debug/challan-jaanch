import AVFoundation
import ImageIO
import UniformTypeIdentifiers

guard CommandLine.arguments.count == 4 else { fatalError("usage: extract-frame.swift VIDEO TIME_SECONDS OUTPUT_PNG") }
let asset = AVAsset(url: URL(fileURLWithPath: CommandLine.arguments[1]))
let generator = AVAssetImageGenerator(asset: asset)
generator.appliesPreferredTrackTransform = true
generator.requestedTimeToleranceBefore = .zero
generator.requestedTimeToleranceAfter = .zero
let image = try generator.copyCGImage(at: CMTime(seconds: Double(CommandLine.arguments[2]) ?? 0, preferredTimescale: 600), actualTime: nil)
guard let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: CommandLine.arguments[3]) as CFURL, UTType.png.identifier as CFString, 1, nil) else { fatalError("could not create image destination") }
CGImageDestinationAddImage(destination, image, nil)
guard CGImageDestinationFinalize(destination) else { fatalError("could not write frame") }
