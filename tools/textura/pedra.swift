// Gera a textura de parede de caverna (pedras cinza-escuras) do fundo do site.
// Ruído celular (pedras + frestas) + ruído fractal (aspereza) + iluminação pelo relevo.
// Uso: pedra <saida.png> [largura] [altura]
import AppKit

let args = CommandLine.arguments
let out = args.count > 1 ? args[1] : "pedra.png"
let W = args.count > 2 ? Int(args[2])! : 1800
let H = args.count > 3 ? Int(args[3])! : 1200

// gerador pseudoaleatório determinístico
func hash(_ x: Int, _ y: Int, _ s: Int = 0) -> Double {
    var h = UInt64(bitPattern: Int64(x &* 374761393 &+ y &* 668265263 &+ s &* 1442695041))
    h = (h ^ (h >> 13)) &* 1274126177
    h ^= h >> 16
    return Double(h & 0xFFFFFF) / Double(0xFFFFFF)
}
func smooth(_ t: Double) -> Double { t * t * (3 - 2 * t) }
func valueNoise(_ x: Double, _ y: Double, _ s: Int) -> Double {
    let xi = Int(floor(x)), yi = Int(floor(y))
    let xf = x - floor(x), yf = y - floor(y)
    let a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s)
    let u = smooth(xf), v = smooth(yf)
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v
}
func fbm(_ x: Double, _ y: Double, _ oct: Int, _ s: Int) -> Double {
    var sum = 0.0, amp = 0.5, f = 1.0
    for o in 0..<oct { sum += amp * valueNoise(x * f, y * f, s + o * 17); f *= 2.03; amp *= 0.5 }
    return sum
}

// ruído celular: distância ao 1º e 2º centro + id da pedra
let cell = 230.0 // tamanho médio da pedra em px
let cellY = cell * 0.8
func worley(_ px: Double, _ py: Double) -> (Double, Double, Double) {
    // distorce para as pedras não ficarem poligonais demais
    let wx = px + (fbm(px / 160, py / 160, 4, 5) - 0.5) * 150
    let wy = py + (fbm(px / 160, py / 160, 4, 9) - 0.5) * 150
    let gx = Int(floor(wx / cell)), gy = Int(floor(wy / cellY))
    var f1 = 1e9, f2 = 1e9, id = 0.0
    for j in -1...1 { for i in -1...1 {
        let cx = gx + i, cy = gy + j
        let fx = (Double(cx) + 0.15 + 0.7 * hash(cx, cy, 1)) * cell
        let fy = (Double(cy) + 0.15 + 0.7 * hash(cx, cy, 2)) * cellY
        let d = hypot(wx - fx, (wy - fy) * 1.1)
        if d < f1 { f2 = f1; f1 = d; id = hash(cx, cy, 3) } else if d < f2 { f2 = d }
    } }
    return (f1, f2, id)
}

// mapa de altura: blocos de rocha irregulares + estratos + lascas (parede de caverna)
func ridged(_ x: Double, _ y: Double, _ oct: Int, _ s: Int) -> Double {
    var sum = 0.0, amp = 0.5, f = 1.0
    for o in 0..<oct { let n = 1 - abs(valueNoise(x * f, y * f, s + o * 13) * 2 - 1); sum += amp * n * n; f *= 2.1; amp *= 0.5 }
    return sum
}
var height = [Double](repeating: 0, count: W * H)
for y in 0..<H { for x in 0..<W {
    let px = Double(x), py = Double(y)
    let (f1, f2, id) = worley(px, py)
    let edge = f2 - f1
    let cw = 4 + 22 * fbm(px / 80, py / 80, 3, 41)
    let crack = smooth(min(1, max(0, (edge - 2) / cw)))       // fendas entre blocos
    let dome = pow(max(0, 1 - f1 / (cell * 0.9)), 0.7)          // bloco abaulado, saliente
    let strata = ridged(px / 260, py / 55, 4, 51)                // camadas da rocha (alongadas na horizontal)
    let chips = ridged(px / 38, py / 30, 4, 61)                  // lascas e quinas
    let rough = fbm(px / 9, py / 9, 4, 21)                       // aspereza
    let big = fbm(px / 300, py / 300, 3, 33)                     // ondulação da parede
    // cada bloco é uma face de rocha inclinada para um lado (pega a luz de um jeito próprio)
    let ang = id * 6.283, tilt = 0.55 + 0.9 * hash(Int(id * 1e6), 7, 8)
    let face = (px * cos(ang) + py * sin(ang)) / cell * tilt
    let local = face - (f1 > 0 ? 0 : 0)
    var h = crack * (0.2 + 0.35 * dome + 0.45 * (0.5 + 0.5 * sin(local * 0.9 + id * 40)))
    h += 0.26 * strata + 0.24 * chips + 0.10 * rough + 0.30 * big
    height[y * W + x] = h
} }

// iluminação pelo relevo (luz vindo de cima, levemente à esquerda) + cor de pedra cinza-escura
let ctx = CGContext(data: nil, width: W, height: H, bitsPerComponent: 8, bytesPerRow: W * 4,
                    space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
let p = ctx.data!.bindMemory(to: UInt8.self, capacity: W * H * 4)
let L = (x: -0.55, y: -0.7, z: 0.38)   // luz rasante: realça o relevo
let ln = sqrt(L.x * L.x + L.y * L.y + L.z * L.z)
for y in 0..<H { for x in 0..<W {
    let h = height[y * W + x]
    let hx = height[y * W + min(W - 1, x + 1)] - height[y * W + max(0, x - 1)]
    let hy = height[min(H - 1, y + 1) * W + x] - height[max(0, y - 1) * W + x]
    var n = (x: -hx * 9, y: -hy * 9, z: 1.0)
    let nl = sqrt(n.x * n.x + n.y * n.y + n.z * n.z); n = (n.x / nl, n.y / nl, n.z / nl)
    let diff = max(0, (n.x * L.x + n.y * L.y + n.z * L.z) / ln)
    let ao = 0.08 + 0.92 * min(1, max(0, h - 0.15) * 1.25)  // fendas quase pretas
    var v = (0.035 + 0.36 * pow(diff, 1.3)) * ao
    v += (fbm(Double(x) / 6, Double(y) / 6, 2, 77) - 0.5) * 0.05 // grão
    v = max(0, min(1, v))
    let tint = 0.94 + 0.06 * hash(x / 120, y / 120, 99)  // variação sutil (frio/quente)
    let r = v * 0.95 * tint, g = v * 0.97, b = v * 1.02
    let i = (y * W + x) * 4
    p[i] = UInt8(min(255, r * 255)); p[i + 1] = UInt8(min(255, g * 255)); p[i + 2] = UInt8(min(255, b * 255)); p[i + 3] = 255
} }
let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: out))
print("ok \(W)x\(H)")
