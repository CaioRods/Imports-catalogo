// Padroniza as fotos oficiais para capa do site:
// tira o fundo (Vision, recorte do próprio macOS), corta no aparelho, centraliza num quadro
// 1200×1200 transparente, com o aparelho sempre do mesmo tamanho e uma sombra de contato suave.
// Uso: estilizar <entrada.png> <saida.png>
import AppKit
import Vision
import CoreImage

let args = CommandLine.arguments
guard args.count == 3, let src = NSImage(contentsOfFile: args[1]),
      let cg = src.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("uso: estilizar entrada.png saida.png\n".data(using: .utf8)!); exit(1)
}

// 1. recorte do aparelho: o fundo da Apple é uma cor lisa (ou transparente). Preenche a partir
// das bordas tudo que é fundo e para no contorno do aparelho; a borda ganha transição suave.
func removeBackground(_ img: CGImage) -> CGImage {
    let w = img.width, h = img.height
    let c = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                      space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    c.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
    let p = c.data!.bindMemory(to: UInt8.self, capacity: w * h * 4)
    // cor do fundo = mais comum entre os pixels opacos da borda
    var counts: [UInt32: Int] = [:]
    func key(_ i: Int) -> UInt32 { UInt32(p[i]) << 16 | UInt32(p[i + 1]) << 8 | UInt32(p[i + 2]) }
    for x in 0..<w { for y in [0, h / 2, h - 1] { let i = (y * w + x) * 4; if p[i + 3] > 250 { counts[key(i), default: 0] += 1 } } }
    for y in 0..<h { for x in [0, w - 1] { let i = (y * w + x) * 4; if p[i + 3] > 250 { counts[key(i), default: 0] += 1 } } }
    let bg = counts.max { $0.value < $1.value }?.key ?? 0xF5F5F7
    let br = Int(bg >> 16 & 255), bgG = Int(bg >> 8 & 255), bb = Int(bg & 255)
    func dist(_ i: Int) -> Int { abs(Int(p[i]) - br) + abs(Int(p[i + 1]) - bgG) + abs(Int(p[i + 2]) - bb) }
    let tol = 7
    var isBG = [Bool](repeating: false, count: w * h)
    var stack: [Int] = []
    func push(_ k: Int) { if !isBG[k] { let i = k * 4; if p[i + 3] < 10 || dist(i) <= tol { isBG[k] = true; stack.append(k) } } }
    for x in 0..<w { push(x); push((h - 1) * w + x) }
    for y in 0..<h { push(y * w); push(y * w + w - 1) }
    while let k = stack.popLast() {
        let x = k % w, y = k / w
        if x > 0 { push(k - 1) }; if x < w - 1 { push(k + 1) }
        if y > 0 { push(k - w) }; if y < h - 1 { push(k + w) }
    }
    for k in 0..<(w * h) {
        let i = k * 4
        if isBG[k] { p[i] = 0; p[i + 1] = 0; p[i + 2] = 0; p[i + 3] = 0; continue }
        // borda: perto de algum fundo → alfa proporcional à diferença de cor (antisserrilhado)
        let x = k % w, y = k / w
        let nearBG = (x > 0 && isBG[k - 1]) || (x < w - 1 && isBG[k + 1]) || (y > 0 && isBG[k - w]) || (y < h - 1 && isBG[k + w])
        if nearBG {
            let a = min(1, Double(dist(i)) / 60)
            p[i] = UInt8(Double(p[i]) * a); p[i + 1] = UInt8(Double(p[i + 1]) * a); p[i + 2] = UInt8(Double(p[i + 2]) * a)
            p[i + 3] = UInt8(255 * a)
        }
    }
    return c.makeImage()!
}
let cut = removeBackground(cg)

// 2. caixa do conteúdo (pixels com alfa)
let w = cut.width, h = cut.height
let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
ctx.draw(cut, in: CGRect(x: 0, y: 0, width: w, height: h))
let px = ctx.data!.bindMemory(to: UInt8.self, capacity: w * h * 4)
var minX = w, minY = h, maxX = 0, maxY = 0
for y in 0..<h { for x in 0..<w where px[(y * w + x) * 4 + 3] > 20 {
    minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
} }
guard maxX > minX, maxY > minY, let content = ctx.makeImage()?.cropping(to: CGRect(x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1)) else {
    FileHandle.standardError.write("sem conteúdo\n".data(using: .utf8)!); exit(2)
}

// 3. quadro padrão
let S = 1200
let out = CGContext(data: nil, width: S, height: S, bitsPerComponent: 8, bytesPerRow: S * 4,
                    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
out.interpolationQuality = .high
let cw = CGFloat(content.width), ch = CGFloat(content.height)
let scale = min(CGFloat(S) * 0.84 / cw, CGFloat(S) * 0.80 / ch)
let dw = cw * scale, dh = ch * scale
let dx = (CGFloat(S) - dw) / 2, dy = CGFloat(S) * 0.12
// sombra de contato (elipse desfocada embaixo)
out.saveGState()
out.setShadow(offset: CGSize(width: 0, height: 0), blur: 40, color: NSColor(white: 0, alpha: 0.45).cgColor)
out.setFillColor(NSColor(white: 0, alpha: 0.35).cgColor)
out.fillEllipse(in: CGRect(x: dx + dw * 0.1, y: dy - 14, width: dw * 0.8, height: 22))
out.restoreGState()
out.draw(content, in: CGRect(x: dx, y: dy, width: dw, height: dh))

let rep = NSBitmapImageRep(cgImage: out.makeImage()!)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: args[2]))
