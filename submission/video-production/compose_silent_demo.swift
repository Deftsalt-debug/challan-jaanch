import AppKit
import AVFoundation
import CoreGraphics
import Foundation

struct Scene {
  let kind: String
  let imageName: String?
  let eyebrow: String
  let title: String
  let caption: String
  let duration: Double
}

let scenes: [Scene] = [
  Scene(kind: "screenshot", imageName: "01-home.png", eyebrow: "01 · THE CITIZEN PROBLEM", title: "See the mismatch. Show the proof.", caption: "Incorrect eChallans leave citizens comparing a challan, photograph and vehicle record without knowing whether the evidence supports a grievance. Challan Jaanch turns that confusion into an explainable evidence preflight.", duration: 8.5),
  Scene(kind: "screenshot", imageName: "02-review.png", eyebrow: "02 · VERIFY BEFORE YOU COMPARE", title: "Every consequential field has a source.", caption: "This public demonstration uses synthetic records only. The citizen checks the registration marks and vehicle family before comparison is unlocked.", duration: 8.5),
  Scene(kind: "screenshot", imageName: "03-character-diff.png", eyebrow: "03 · HUMAN GATE", title: "Character-level evidence, not a guess.", caption: "The source lens and character diff expose the exact disagreement. Editing any value immediately removes its confirmation.", duration: 7.5),
  Scene(kind: "screenshot", imageName: "05-result.png", eyebrow: "04 · NARROW FINDINGS", title: "Two independent contradictions are supported.", caption: "The photographed plate conflicts with both records, and the photographed two-wheeler conflicts with a passenger-car record. These are factual conflicts—not a legal verdict.", duration: 8.5),
  Scene(kind: "screenshot", imageName: "06-sceptic.png", eyebrow: "05 · ABSTENTION", title: "Uncertainty stops the claim.", caption: "Sceptic mode keeps counter-checks and limitations visible. If a decisive character or source is unclear, the rules return unable to assess instead of manufacturing confidence.", duration: 8.5),
  Scene(kind: "screenshot", imageName: "08-packet-ready.png", eyebrow: "06 · PORTABLE EVIDENCE", title: "A packet with a complete audit trail.", caption: "Confirmed findings become a redacted PDF, a machine-readable JSON manifest and a bilingual share brief—with evidence anchors, integrity fingerprints and official boundaries attached.", duration: 8.5),
  Scene(kind: "screenshot", imageName: "12-scam-response.png", eyebrow: "07 · SCAM SHIELD", title: "Check the message. Never open its route.", caption: "Scam Shield inspects pasted text locally, detects APK lures, lookalike domains, OTP requests and coercion, then gives exposure-specific containment and reporting steps.", duration: 9.0),
  Scene(kind: "screenshot", imageName: "13-local-ai-choice.png", eyebrow: "08 · PRIVACY BY DESIGN", title: "Local-first document handling.", caption: "The local path keeps file bytes in the browser and computes only SHA-256 fingerprints. Optional AI extraction is separately consented and preflighted.", duration: 8.5),
  Scene(kind: "diagram", imageName: nil, eyebrow: "09 · SYSTEM BOUNDARY", title: "Artifacts → verified facts → deterministic finding → portable packet", caption: "The interface is a state machine. Pure domain rules own the decision; the optional model only extracts observable fields. Official authorities still decide.", duration: 10.5),
  Scene(kind: "screenshot", imageName: "16-technology.png", eyebrow: "10 · FRAMEWORK CHOICES", title: "A small, explicit stack for a high-trust workflow.", caption: "React 19 and TypeScript drive accessible stateful interactions. Tailwind CSS 4 keeps the visual system responsive. Vinext and Vite produce a Next-compatible Cloudflare Worker build.", duration: 10.5),
  Scene(kind: "screenshot", imageName: "17-trust-model.png", eyebrow: "11 · CODING STANDARDS", title: "Strict contracts make the boundary testable.", caption: "Strict TypeScript, isolated modules, ESLint Core Web Vitals, runtime schema validation, pure comparison functions and 36 deterministic tests gate every release.", duration: 10.0),
  Scene(kind: "outro", imageName: nil, eyebrow: "12 · SUBMISSION BUILD", title: "AI may read. Citizens verify. Code compares.", caption: "Challan Jaanch is not a government service or legal adviser. It gives citizens clearer evidence, safer next steps and a packet they can carry to the official process. challan-jaanch.deftsalt.chatgpt.site", duration: 9.0),
]

let width = 1920
let height = 1080
let fps = 30
let background = NSColor(calibratedRed: 0.055, green: 0.105, blue: 0.135, alpha: 1)
let cream = NSColor(calibratedRed: 0.95, green: 0.94, blue: 0.91, alpha: 1)
let blue = NSColor(calibratedRed: 0.31, green: 0.48, blue: 0.57, alpha: 1)
let green = NSColor(calibratedRed: 0.34, green: 0.58, blue: 0.44, alpha: 1)
let muted = NSColor(calibratedRed: 0.72, green: 0.78, blue: 0.78, alpha: 1)

func imageAt(_ path: String) -> NSImage? {
  NSImage(contentsOfFile: path)
}

func drawText(_ text: String, in rect: CGRect, font: NSFont, color: NSColor, alignment: NSTextAlignment = .left) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = alignment
  paragraph.lineBreakMode = .byWordWrapping
  let attributes: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: color,
    .paragraphStyle: paragraph,
  ]
  (text as NSString).draw(in: rect, withAttributes: attributes)
}

func rounded(_ rect: CGRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil, lineWidth: CGFloat = 1) {
  let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
  fill.setFill()
  path.fill()
  if let stroke {
    stroke.setStroke()
    path.lineWidth = lineWidth
    path.stroke()
  }
}

func arrow(from start: CGPoint, to end: CGPoint, color: NSColor, width: CGFloat = 4) {
  color.setStroke()
  let path = NSBezierPath()
  path.move(to: start)
  path.line(to: end)
  path.lineWidth = width
  path.stroke()
  let angle = atan2(end.y - start.y, end.x - start.x)
  let size: CGFloat = 14
  let p1 = CGPoint(x: end.x - size * cos(angle - .pi / 6), y: end.y - size * sin(angle - .pi / 6))
  let p2 = CGPoint(x: end.x - size * cos(angle + .pi / 6), y: end.y - size * sin(angle + .pi / 6))
  path.move(to: p1)
  path.line(to: end)
  path.line(to: p2)
  path.stroke()
}

func drawDiagram() {
  drawText("A bounded, reviewable pipeline", in: CGRect(x: 110, y: 165, width: 1700, height: 70), font: .systemFont(ofSize: 46, weight: .bold), color: cream)
  drawText("No automated legal conclusion crosses the decision boundary.", in: CGRect(x: 110, y: 240, width: 1700, height: 42), font: .systemFont(ofSize: 24, weight: .medium), color: muted)

  let boxes: [(CGRect, String, String, NSColor)] = [
    (CGRect(x: 100, y: 395, width: 330, height: 180), "Citizen artifacts", "challan · photo · vehicle record", NSColor(calibratedRed: 0.14, green: 0.23, blue: 0.27, alpha: 1)),
    (CGRect(x: 520, y: 395, width: 330, height: 180), "Observable facts", "plate · date · class · amount", NSColor(calibratedRed: 0.18, green: 0.31, blue: 0.37, alpha: 1)),
    (CGRect(x: 940, y: 395, width: 330, height: 180), "Human gate", "edit · source clarity · confirm", NSColor(calibratedRed: 0.22, green: 0.37, blue: 0.37, alpha: 1)),
    (CGRect(x: 1360, y: 395, width: 430, height: 180), "Deterministic rules", "supported · refused · no ground", NSColor(calibratedRed: 0.23, green: 0.39, blue: 0.31, alpha: 1)),
  ]
  for (rect, heading, subheading, color) in boxes {
    rounded(rect, radius: 20, fill: color, stroke: NSColor.white.withAlphaComponent(0.15), lineWidth: 2)
    drawText(heading, in: CGRect(x: rect.minX + 24, y: rect.minY + 70, width: rect.width - 48, height: 42), font: .systemFont(ofSize: 26, weight: .bold), color: cream)
    drawText(subheading, in: CGRect(x: rect.minX + 24, y: rect.minY + 24, width: rect.width - 48, height: 38), font: .systemFont(ofSize: 17, weight: .medium), color: muted)
  }
  arrow(from: CGPoint(x: 440, y: 485), to: CGPoint(x: 510, y: 485), color: blue)
  arrow(from: CGPoint(x: 860, y: 485), to: CGPoint(x: 930, y: 485), color: blue)
  arrow(from: CGPoint(x: 1280, y: 485), to: CGPoint(x: 1350, y: 485), color: green)

  rounded(CGRect(x: 520, y: 690, width: 750, height: 120), radius: 18, fill: NSColor(calibratedRed: 0.12, green: 0.18, blue: 0.21, alpha: 1), stroke: NSColor(calibratedRed: 0.5, green: 0.66, blue: 0.72, alpha: 0.5), lineWidth: 2)
  drawText("Optional OpenAI Responses API", in: CGRect(x: 550, y: 754, width: 690, height: 34), font: .systemFont(ofSize: 24, weight: .bold), color: cream)
  drawText("extracts observable fields only · consented · structured JSON", in: CGRect(x: 550, y: 714, width: 690, height: 30), font: .systemFont(ofSize: 17, weight: .medium), color: muted)
  arrow(from: CGPoint(x: 895, y: 690), to: CGPoint(x: 685, y: 580), color: blue, width: 3)
  drawText("store:false disables retrievable response storage; provider data controls still apply", in: CGRect(x: 520, y: 858, width: 750, height: 34), font: .systemFont(ofSize: 15, weight: .medium), color: muted, alignment: .center)

  rounded(CGRect(x: 1360, y: 690, width: 430, height: 120), radius: 18, fill: NSColor(calibratedRed: 0.13, green: 0.25, blue: 0.2, alpha: 1), stroke: NSColor(calibratedRed: 0.45, green: 0.7, blue: 0.54, alpha: 0.65), lineWidth: 2)
  drawText("Portable packet", in: CGRect(x: 1390, y: 754, width: 370, height: 34), font: .systemFont(ofSize: 24, weight: .bold), color: cream)
  drawText("PDF · JSON · share-safe brief", in: CGRect(x: 1390, y: 714, width: 370, height: 30), font: .systemFont(ofSize: 17, weight: .medium), color: muted)
  arrow(from: CGPoint(x: 1575, y: 575), to: CGPoint(x: 1575, y: 680), color: green, width: 3)
}

func drawTechCards() {
  drawText("Engineering choices that keep the product explainable", in: CGRect(x: 110, y: 165, width: 1700, height: 68), font: .systemFont(ofSize: 42, weight: .bold), color: cream)
  let cards: [(String, String, NSColor)] = [
    ("React 19 + TypeScript", "Typed state machine and accessible interactions", blue),
    ("Tailwind CSS 4", "Responsive tokens and touch-friendly components", NSColor(calibratedRed: 0.31, green: 0.55, blue: 0.61, alpha: 1)),
    ("Vinext + Vite 8", "Next-compatible routing and Cloudflare Worker output", NSColor(calibratedRed: 0.45, green: 0.5, blue: 0.72, alpha: 1)),
    ("OpenAI Responses API", "Optional, consented multimodal extraction", NSColor(calibratedRed: 0.45, green: 0.63, blue: 0.48, alpha: 1)),
    ("Pure TypeScript rules", "Plate, family, duplicate and Rule 167 comparisons", NSColor(calibratedRed: 0.74, green: 0.55, blue: 0.33, alpha: 1)),
    ("jsPDF + Web Crypto", "Client-side packet export and SHA-256 fingerprints", NSColor(calibratedRed: 0.62, green: 0.45, blue: 0.52, alpha: 1)),
  ]
  for (index, card) in cards.enumerated() {
    let column = index % 3
    let row = index / 3
    let x = CGFloat(110 + column * 585)
    let y = CGFloat(335 + row * 260)
    rounded(CGRect(x: x, y: y, width: 520, height: 200), radius: 18, fill: NSColor(calibratedWhite: 1, alpha: 0.06), stroke: card.2.withAlphaComponent(0.65), lineWidth: 2)
    rounded(CGRect(x: x + 24, y: y + 138, width: 12, height: 32), radius: 6, fill: card.2)
    drawText(card.0, in: CGRect(x: x + 58, y: y + 130, width: 430, height: 45), font: .systemFont(ofSize: 25, weight: .bold), color: cream)
    drawText(card.1, in: CGRect(x: x + 58, y: y + 58, width: 430, height: 58), font: .systemFont(ofSize: 19, weight: .medium), color: muted)
  }
}

func drawOutro() {
  rounded(CGRect(x: 140, y: 240, width: 1640, height: 520), radius: 28, fill: NSColor(calibratedWhite: 1, alpha: 0.06), stroke: NSColor.white.withAlphaComponent(0.16), lineWidth: 2)
  drawText("CHALLAN JAANCH", in: CGRect(x: 235, y: 650, width: 1450, height: 34), font: .systemFont(ofSize: 18, weight: .bold), color: blue)
  drawText("AI may read.\nCitizens verify.\nCode compares.", in: CGRect(x: 235, y: 365, width: 1450, height: 260), font: .systemFont(ofSize: 76, weight: .bold), color: cream)
  drawText("A safer, explainable preflight before the official grievance process.", in: CGRect(x: 235, y: 305, width: 1450, height: 40), font: .systemFont(ofSize: 25, weight: .medium), color: muted)
  drawText("challan-jaanch.deftsalt.chatgpt.site", in: CGRect(x: 235, y: 185, width: 1450, height: 42), font: .monospacedSystemFont(ofSize: 24, weight: .medium), color: cream)
}

func drawScene(_ scene: Scene, image: NSImage?, localProgress: Double, globalProgress: Double, context: CGContext) {
  background.setFill()
  context.fill(CGRect(x: 0, y: 0, width: width, height: height))

  if scene.kind == "screenshot", let image {
    let frame = CGRect(x: 70, y: 88, width: 1780, height: 1004)
    let scale = 1.0 + CGFloat(localProgress) * 0.018
    let scaled = CGRect(x: frame.midX - frame.width * scale / 2, y: frame.midY - frame.height * scale / 2, width: frame.width * scale, height: frame.height * scale)
    image.draw(in: scaled, from: NSRect(origin: .zero, size: image.size), operation: .sourceOver, fraction: 1, respectFlipped: true, hints: [.interpolation: NSImageInterpolation.high])
    NSColor(calibratedRed: 0.02, green: 0.04, blue: 0.05, alpha: 0.84).setFill()
    NSBezierPath(roundedRect: CGRect(x: 78, y: 790, width: 1764, height: 260), xRadius: 20, yRadius: 20).fill()
  } else if scene.kind == "diagram" {
    drawDiagram()
  } else if scene.kind == "tech" {
    drawTechCards()
  } else {
    drawOutro()
  }

  if scene.kind != "diagram" && scene.kind != "outro" {
    rounded(CGRect(x: 110, y: 105, width: 470, height: 40), radius: 10, fill: NSColor(calibratedRed: 0.055, green: 0.105, blue: 0.135, alpha: 0.92), stroke: NSColor.white.withAlphaComponent(0.18), lineWidth: 1)
  }
  if scene.kind != "outro" {
    drawText(scene.eyebrow, in: CGRect(x: 130, y: 118, width: 1680, height: 30), font: .systemFont(ofSize: 17, weight: .bold), color: blue)
  }
  if scene.kind == "screenshot" {
    drawText(scene.title, in: CGRect(x: 120, y: 820, width: 1680, height: 70), font: .systemFont(ofSize: 42, weight: .bold), color: cream)
    drawText(scene.caption, in: CGRect(x: 120, y: 900, width: 1660, height: 126), font: .systemFont(ofSize: 24, weight: .medium), color: NSColor(calibratedWhite: 0.92, alpha: 1))
  } else if scene.kind == "diagram" {
    drawText(scene.caption, in: CGRect(x: 110, y: 945, width: 1700, height: 70), font: .systemFont(ofSize: 22, weight: .medium), color: NSColor(calibratedWhite: 0.92, alpha: 1))
  } else if scene.kind == "outro" {
    // The custom outro already includes its closing subtitle and URL.
  } else {
    drawText(scene.title, in: CGRect(x: 110, y: 858, width: 1700, height: 62), font: .systemFont(ofSize: 40, weight: .bold), color: cream)
    drawText(scene.caption, in: CGRect(x: 110, y: 930, width: 1700, height: 95), font: .systemFont(ofSize: 22, weight: .medium), color: NSColor(calibratedWhite: 0.92, alpha: 1))
  }

  NSColor(calibratedWhite: 1, alpha: 0.12).setFill()
  context.fill(CGRect(x: 110, y: 45, width: 1700, height: 4))
  blue.setFill()
  context.fill(CGRect(x: 110, y: 45, width: 1700 * CGFloat(globalProgress), height: 4))
  drawText("CHALLAN JAANCH  ·  EVIDENCE-FIRST CIVIC TECH", in: CGRect(x: 110, y: 62, width: 1000, height: 24), font: .systemFont(ofSize: 14, weight: .bold), color: muted)
  drawText("LIVE PRODUCT CAPTURE", in: CGRect(x: 1450, y: 62, width: 360, height: 24), font: .systemFont(ofSize: 14, weight: .bold), color: muted, alignment: .right)
}

func makePixelBuffer(pool: CVPixelBufferPool) -> CVPixelBuffer {
  var pixelBuffer: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, pool, &pixelBuffer)
  guard let pixelBuffer else { fatalError("Could not allocate video frame") }
  return pixelBuffer
}

func renderFrame(_ frameIndex: Int, totalDuration: Double, images: [String: NSImage], pool: CVPixelBufferPool) -> CVPixelBuffer {
  let time = Double(frameIndex) / Double(fps)
  var cursor = 0.0
  var scene = scenes[0]
  var localProgress = 0.0
  for candidate in scenes {
    if time < cursor + candidate.duration { scene = candidate; localProgress = (time - cursor) / candidate.duration; break }
    cursor += candidate.duration
  }
  let globalProgress = min(1, time / totalDuration)
  let pixelBuffer = makePixelBuffer(pool: pool)
  CVPixelBufferLockBaseAddress(pixelBuffer, [])
  defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }
  guard let base = CVPixelBufferGetBaseAddress(pixelBuffer) else { return pixelBuffer }
  let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
  guard let context = CGContext(data: base, width: width, height: height, bitsPerComponent: 8, bytesPerRow: bytesPerRow, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue) else { return pixelBuffer }
  context.setAllowsAntialiasing(true)
  let graphics = NSGraphicsContext(cgContext: context, flipped: false)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = graphics
  drawScene(scene, image: scene.imageName.flatMap { images[$0] }, localProgress: localProgress, globalProgress: globalProgress, context: context)
  let fade = min(localProgress / 0.22, (1 - localProgress) / 0.22, 1)
  if fade < 1 {
    NSColor(calibratedRed: 0.055, green: 0.105, blue: 0.135, alpha: 1 - max(0, fade)).setFill()
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
  }
  NSGraphicsContext.restoreGraphicsState()
  return pixelBuffer
}

func fail(_ message: String) -> Never {
  fputs("compose_silent_demo: \(message)\n", stderr)
  exit(1)
}

let arguments = CommandLine.arguments
guard arguments.count >= 3 else { fail("usage: compose_silent_demo.swift ASSET_DIR OUTPUT_MP4") }
let assetDir = arguments[1]
let outputURL = URL(fileURLWithPath: arguments[2])
let imageMap = Dictionary(uniqueKeysWithValues: scenes.compactMap { scene -> (String, NSImage)? in
  guard let imageName = scene.imageName, let image = imageAt(URL(fileURLWithPath: assetDir).appendingPathComponent(imageName).path) else { return nil }
  return (imageName, image)
})
guard imageMap.count == scenes.compactMap(\.imageName).count else { fail("one or more screenshot assets are missing") }

let totalDuration = scenes.reduce(0) { $0 + $1.duration }
try? FileManager.default.removeItem(at: outputURL)
let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let settings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: width,
  AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 5_500_000,
    AVVideoMaxKeyFrameIntervalKey: fps * 2,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
  ],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let sourceAttributes: [String: Any] = [
  kCVPixelBufferPixelFormatTypeKey as String: Int(kCVPixelFormatType_32BGRA),
  kCVPixelBufferWidthKey as String: width,
  kCVPixelBufferHeightKey as String: height,
  kCVPixelBufferCGImageCompatibilityKey as String: true,
  kCVPixelBufferCGBitmapContextCompatibilityKey as String: true,
]
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: sourceAttributes)
writer.add(input)
guard writer.startWriting() else { fail(writer.error?.localizedDescription ?? "could not start writer") }
writer.startSession(atSourceTime: .zero)
let totalFrames = Int(ceil(totalDuration * Double(fps)))
for frameIndex in 0..<totalFrames {
  while !input.isReadyForMoreMediaData { Thread.sleep(forTimeInterval: 0.001) }
  let pixelBuffer = renderFrame(frameIndex, totalDuration: totalDuration, images: imageMap, pool: adaptor.pixelBufferPool!)
  let timestamp = CMTime(value: CMTimeValue(frameIndex), timescale: CMTimeScale(fps))
  guard adaptor.append(pixelBuffer, withPresentationTime: timestamp) else { fail(writer.error?.localizedDescription ?? "could not append frame \(frameIndex)") }
}
input.markAsFinished()
let group = DispatchGroup()
group.enter()
writer.finishWriting { group.leave() }
group.wait()
guard writer.status == .completed else { fail(writer.error?.localizedDescription ?? "writer did not complete") }
print("created \(outputURL.path) · \(String(format: "%.1f", totalDuration))s · 1920x1080 · silent H.264")
