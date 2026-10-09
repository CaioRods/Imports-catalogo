import AppKit
// Ícone do app do catálogo: quadrado cheio (sem transparência), maçã laranja-cósmico e "CATÁLOGO" embaixo.
let dir = CommandLine.arguments[1], out = CommandLine.arguments[2]
let N: CGFloat = 1024
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(N), pixelsHigh: Int(N), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let ctx = NSGraphicsContext.current!.cgContext
let cs = CGColorSpaceCreateDeviceRGB()
func c(_ h: UInt32, _ a: CGFloat = 1) -> CGColor { CGColor(red: CGFloat(h >> 16 & 255) / 255, green: CGFloat(h >> 8 & 255) / 255, blue: CGFloat(h & 255) / 255, alpha: a) }
// fundo preto fosco com luz de cima (igual ao ícone do sistema)
ctx.setFillColor(c(0x0c0c0d)); ctx.fill(CGRect(x: 0, y: 0, width: N, height: N))
let bg = CGGradient(colorsSpace: cs, colors: [c(0x2c2c2f), c(0x161617), c(0x0b0b0c)] as CFArray, locations: [0, 0.55, 1])!
ctx.drawRadialGradient(bg, startCenter: CGPoint(x: N / 2, y: N * 0.78), startRadius: 0, endCenter: CGPoint(x: N / 2, y: N * 0.6), endRadius: N * 0.85, options: [.drawsAfterEndLocation])
// brilho laranja suave atrás da maçã
let glow = CGGradient(colorsSpace: cs, colors: [c(0xf26a21, 0.32), c(0xf26a21, 0)] as CFArray, locations: [0, 1])!
ctx.drawRadialGradient(glow, startCenter: CGPoint(x: N / 2, y: N * 0.56), startRadius: 0, endCenter: CGPoint(x: N / 2, y: N * 0.56), endRadius: N * 0.36, options: [])
// maçã
let apple = NSImage(contentsOfFile: dir + "/maca.svg")!
let ah = N * 0.43, aw = ah * 81.30 / 100
let ar = NSRect(x: (N - aw) / 2 + N * 0.004, y: N * 0.335, width: aw, height: ah)
ctx.saveGState()
ctx.setShadow(offset: CGSize(width: 0, height: -10), blur: 28, color: c(0x000000, 0.7))
apple.draw(in: ar)
ctx.restoreGState()
// "CATÁLOGO"
let font = NSFont.systemFont(ofSize: 66, weight: .semibold)
let para = NSMutableParagraphStyle(); para.alignment = .center
let attrs: [NSAttributedString.Key: Any] = [.font: font, .kern: 15, .foregroundColor: NSColor(calibratedWhite: 0.9, alpha: 1), .paragraphStyle: para]
let text = NSAttributedString(string: "CATÁLOGO", attributes: attrs)
let ts = text.size()
text.draw(in: NSRect(x: 7.5, y: N * 0.155, width: N, height: ts.height))   // +metade do espaçamento final para centralizar
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
print("ok")
