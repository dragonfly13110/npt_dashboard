Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$outDir = Join-Path $PSScriptRoot "..\docs\generated_infographics"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$W = 1080
$H = 1920

function C($hex) {
    $h = $hex.TrimStart("#")
    return [System.Drawing.Color]::FromArgb(
        [Convert]::ToInt32($h.Substring(0,2),16),
        [Convert]::ToInt32($h.Substring(2,2),16),
        [Convert]::ToInt32($h.Substring(4,2),16)
    )
}

$navy = C "#12345A"
$green = C "#1F8A5B"
$gold = C "#D6A11D"
$sky = C "#58A9D6"
$slate = C "#5C6F8E"
$orange = C "#D96C3B"
$teal = C "#198C8C"
$violet = C "#7765B8"
$gray = C "#F2F5F7"
$line = C "#D9E2E8"
$text = C "#1C2833"
$muted = C "#5D6D7E"
$white = [System.Drawing.Color]::White

function Font($size, $style = [System.Drawing.FontStyle]::Regular) {
    $families = @("Noto Sans Thai", "Leelawadee UI", "Tahoma", "Arial")
    foreach ($name in $families) {
        try { return New-Object System.Drawing.Font($name, $size, $style, [System.Drawing.GraphicsUnit]::Pixel) } catch {}
    }
}

$fontTitle = Font 56 ([System.Drawing.FontStyle]::Bold)
$fontSub = Font 28 ([System.Drawing.FontStyle]::Regular)
$fontHead = Font 34 ([System.Drawing.FontStyle]::Bold)
$fontBody = Font 25 ([System.Drawing.FontStyle]::Regular)
$fontSmall = Font 21 ([System.Drawing.FontStyle]::Regular)
$fontTiny = Font 18 ([System.Drawing.FontStyle]::Regular)

function RoundRectPath($x, $y, $w, $h, $r) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $p.AddArc($x, $y, $d, $d, 180, 90)
    $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
}

function FillRound($g, $rect, $color, $r = 28) {
    $b = New-Object System.Drawing.SolidBrush($color)
    $p = RoundRectPath $rect.X $rect.Y $rect.Width $rect.Height $r
    $g.FillPath($b, $p)
    $p.Dispose(); $b.Dispose()
}

function StrokeRound($g, $rect, $color, $r = 28, $width = 3) {
    $p = RoundRectPath $rect.X $rect.Y $rect.Width $rect.Height $r
    $pen = New-Object System.Drawing.Pen($color, $width)
    $g.DrawPath($pen, $p)
    $pen.Dispose(); $p.Dispose()
}

function DrawText($g, $s, $font, $color, $x, $y, $w, $h, $align = "Near") {
    $b = New-Object System.Drawing.SolidBrush($color)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::$align
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Near
    $sf.Trimming = [System.Drawing.StringTrimming]::EllipsisWord
    $sf.FormatFlags = [System.Drawing.StringFormatFlags]::LineLimit
    $g.DrawString($s, $font, $b, [System.Drawing.RectangleF]::new($x, $y, $w, $h), $sf)
    $sf.Dispose(); $b.Dispose()
}

function DrawBulletList($g, $items, $x, $y, $w, $font, $color, $accent) {
    $cy = $y
    foreach ($item in $items) {
        $bb = New-Object System.Drawing.SolidBrush($accent)
        $g.FillEllipse($bb, $x, $cy + 9, 10, 10)
        $bb.Dispose()
        DrawText $g $item $font $color ($x + 22) $cy ($w - 22) 58
        $cy += 58
    }
}

function DrawPill($g, $label, $x, $y, $w, $color) {
    $rect = [System.Drawing.Rectangle]::new($x, $y, $w, 50)
    FillRound $g $rect ([System.Drawing.Color]::FromArgb(28, $color)) 25
    StrokeRound $g $rect ([System.Drawing.Color]::FromArgb(120, $color)) 25 2
    DrawText $g $label $fontSmall $color ($x + 16) ($y + 11) ($w - 32) 32 "Center"
}

function DrawHeader($g, $title, $subtitle) {
    DrawText $g "NPT Smart Agri Dashboard" $fontSmall $green 72 52 500 36
    DrawText $g $title $fontTitle $navy 72 98 936 142
    DrawText $g $subtitle $fontSub $muted 72 238 936 82
    $pen = New-Object System.Drawing.Pen($line, 3)
    $g.DrawLine($pen, 72, 330, 1008, 330)
    $pen.Dispose()
}

function DrawDashboardMock($g, $x, $y, $w, $h) {
    $rect = [System.Drawing.Rectangle]::new($x, $y, $w, $h)
    FillRound $g $rect $white 28
    StrokeRound $g $rect (C "#C8D8E1") 28 3
    $sb = [System.Drawing.Rectangle]::new($x + 18, $y + 18, 115, $h - 36)
    FillRound $g $sb (C "#153B61") 18
    DrawText $g "NPT`nAgri" $fontSmall $white ($x + 36) ($y + 42) 80 80 "Center"
    $colors = @($green, $sky, $gold)
    for ($i=0; $i -lt 3; $i++) {
        FillRound $g ([System.Drawing.Rectangle]::new($x + 158 + ($i*($w-190)/3), $y + 36, (($w-225)/3), 76)) ([System.Drawing.Color]::FromArgb(28, $colors[$i])) 18
        DrawText $g "KPI" $fontTiny $colors[$i] ($x + 178 + ($i*($w-190)/3)) ($y + 50) 100 24
        DrawText $g ("" + (12 + $i*7) + "K") $fontHead $navy ($x + 178 + ($i*($w-190)/3)) ($y + 72) 130 40
    }
    FillRound $g ([System.Drawing.Rectangle]::new($x + 158, $y + 138, [int](($w-200)*0.52), 180)) (C "#EDF7F3") 20
    DrawText $g "แผนที่นครปฐม" $fontSmall $green ($x + 180) ($y + 160) 230 30
    $pen = New-Object System.Drawing.Pen($green, 5)
    $g.DrawBezier($pen, $x+235, $y+230, $x+320, $y+145, $x+410, $y+250, $x+485, $y+190)
    $g.DrawBezier($pen, $x+250, $y+260, $x+350, $y+330, $x+460, $y+275, $x+520, $y+315)
    $pen.Dispose()
    FillRound $g ([System.Drawing.Rectangle]::new($x + [int]($w*0.64), $y + 138, [int]($w*0.28), 180)) (C "#F8F1DB") 20
    DrawText $g "AI Chat" $fontSmall $gold ($x + [int]($w*0.66)) ($y + 160) 150 30
    DrawText $g "สรุปสถานการณ์`nจากข้อมูลล่าสุด" $fontTiny $text ($x + [int]($w*0.66)) ($y + 202) 210 80
    FillRound $g ([System.Drawing.Rectangle]::new($x + 158, $y + 340, $w - 190, $h - 380)) (C "#F7FAFC") 20
    DrawText $g "กราฟ / ตาราง / รายอำเภอ" $fontSmall $navy ($x + 180) ($y + 360) 420 32
    for ($i=0; $i -lt 6; $i++) {
        $barH = 34 + ($i % 4) * 18
        $brush = New-Object System.Drawing.SolidBrush(@($green,$sky,$gold,$slate,$teal,$orange)[$i])
        $g.FillRectangle($brush, $x + 205 + $i*65, $y + $h - 70 - $barH, 42, $barH)
        $brush.Dispose()
    }
    for ($r=0; $r -lt 4; $r++) {
        $yy = $y + 415 + $r*38
        $p = New-Object System.Drawing.Pen((C "#D7E2E8"), 2)
        $g.DrawLine($p, $x + 580, $yy, $x + $w - 60, $yy)
        $p.Dispose()
    }
}

function NewCanvas {
    $bmp = New-Object System.Drawing.Bitmap($W, $H)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
    $g.Clear($white)
    $bg = New-Object System.Drawing.SolidBrush((C "#FBFCF8"))
    $g.FillRectangle($bg, 0, 0, $W, $H)
    $bg.Dispose()
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(38, $green), 2)
    for ($i=0; $i -lt 11; $i++) {
        $y = 1480 + $i * 34
        $g.DrawBezier($pen, -80, $y, 260, $y - 90, 620, $y + 80, 1160, $y - 55)
    }
    $pen.Dispose()
    return @($bmp, $g)
}

function SaveCanvas($bmp, $g, $name) {
    $path = Join-Path $outDir $name
    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    return (Resolve-Path $path).Path
}

function Generate1 {
    $c = NewCanvas; $bmp = $c[0]; $g = $c[1]
    DrawHeader $g "จากข้อมูลกระจัดกระจาย" "สู่ศูนย์ข้อมูลกลางเกษตรนครปฐม"
    $sections = @(
        @{y=380; h=410; color=$orange; title="ก่อนมีระบบ: ข้อมูลกระจัดกระจาย"; bullets=@("หลายไฟล์ หลายแหล่ง หลายกลุ่มงาน","ค้นหาและสรุปข้อมูลช้า","ทำรายงานซ้ำ เสี่ยงข้อมูลไม่ตรงกัน","ผู้บริหารเห็นภาพรวมจังหวัดได้ยาก")},
        @{y=840; h=300; color=$sky; title="รวบรวม ตรวจสอบ จัดระเบียบ"; bullets=@("รวบรวมข้อมูล","ตรวจสอบความถูกต้อง","เชื่อมโยงแผนที่","กำหนดสิทธิ์และเตรียมข้อมูลให้ AI")},
        @{y=1190; h=520; color=$green; title="หลังมีระบบ: ศูนย์ข้อมูลเกษตรจังหวัด"; bullets=@("ดู Dashboard ภาพรวมจังหวัด","ค้นหาข้ามหลายหมวดข้อมูล","วิเคราะห์ด้วยแผนที่และกราฟ","ใช้ AI ช่วยถามตอบและสรุปข้อมูล","แยก Public Portal และ Internal Dashboard")}
    )
    foreach ($s in $sections) {
        $rect = [System.Drawing.Rectangle]::new(72, $s.y, 936, $s.h)
        FillRound $g $rect ([System.Drawing.Color]::FromArgb(245, 255,255,255)) 34
        StrokeRound $g $rect ([System.Drawing.Color]::FromArgb(90, $s.color)) 34 3
        DrawText $g $s.title $fontHead $s.color 112 ($s.y + 30) 500 46
        DrawBulletList $g $s.bullets 112 ($s.y + 96) 420 $fontBody $text $s.color
    }
    foreach ($x in @(620, 750, 880)) {
        FillRound $g ([System.Drawing.Rectangle]::new($x, 475 + (($x-620)/130)*70, 84, 62)) (C "#EEF2F4") 14
        DrawText $g @("Excel","PDF","Folder")[(($x-620)/130)] $fontTiny $muted ($x+8) (492 + (($x-620)/130)*70) 68 24 "Center"
    }
    DrawPill $g "Data Funnel" 650 930 235 $sky
    $pen = New-Object System.Drawing.Pen($sky, 7)
    $g.DrawLine($pen, 760, 1040, 760, 1180)
    $pen.Dispose()
    DrawDashboardMock $g 570 1285 370 330
    FillRound $g ([System.Drawing.Rectangle]::new(72, 1750, 936, 104)) ([System.Drawing.Color]::FromArgb(35, $green)) 24
    DrawText $g "เป้าหมาย: ลดงาน manual เพิ่มความเร็วในการใช้ข้อมูล และทำให้ข้อมูลเกษตรจังหวัดพร้อมใช้สำหรับผู้บริหาร เจ้าหน้าที่ และประชาชน" $fontBody $navy 108 1774 864 64 "Center"
    SaveCanvas $bmp $g "01-origin-story.png"
}

function Generate2 {
    $c = NewCanvas; $bmp = $c[0]; $g = $c[1]
    DrawHeader $g "ระบบและเทคโนโลยีที่ใช้" "Single Page Application เชื่อมฐานข้อมูลกลาง AI และข้อมูลภายนอกผ่าน Proxy"
    $layers = @(
        @{t="ผู้ใช้งาน"; y=370; color=$green; items=@("ประชาชน","เจ้าหน้าที่","ผู้บริหาร","ผู้ดูแลระบบ")},
        @{t="Frontend Web Application"; y=560; color=$sky; items=@("React + Vite","React Router","Ant Design","Dashboard / Map / Table / Search / Chatbot")},
        @{t="App Logic"; y=770; color=$violet; items=@("AuthContext","Protected Route","React Query Cache","Data Privacy Layer")},
        @{t="Service Layer"; y=980; color=$gold; items=@("Supabase Client","Global Search","Chatbot Data","AI Service","CSV Import / Export")},
        @{t="Backend & Integration"; y=1190; color=$teal; items=@("Supabase Auth + Database + RPC","Netlify Functions / Proxy Gateway","AI Proxy: Gemini / OpenRouter","External APIs: Weather, Hotspot, Prices, News, AQI")},
        @{t="Deploy & Quality"; y=1460; color=$slate; items=@("Netlify Hosting","Vite Build → dist","SPA Redirect","Vitest / Playwright / ESLint")}
    )
    foreach ($l in $layers) {
        $rect = [System.Drawing.Rectangle]::new(92, $l.y, 896, 150)
        FillRound $g $rect ([System.Drawing.Color]::FromArgb(248,255,255,255)) 26
        StrokeRound $g $rect ([System.Drawing.Color]::FromArgb(105, $l.color)) 26 3
        DrawText $g $l.t $fontHead $l.color 128 ($l.y + 24) 330 42
        $xx = 472; $yy = $l.y + 26
        foreach ($it in $l.items) {
            DrawPill $g $it $xx $yy 228 $l.color
            $xx += 248
            if ($xx -gt 850) { $xx = 472; $yy += 62 }
        }
    }
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, $navy), 4)
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor
    foreach ($y in @(520,730,940,1150,1420)) { $g.DrawLine($pen, 540, $y, 540, $y + 36) }
    $pen.Dispose()
    FillRound $g ([System.Drawing.Rectangle]::new(92, 1690, 896, 150)) ([System.Drawing.Color]::FromArgb(38, $navy)) 26
    DrawText $g "จุดเด่นเชิงเทคนิค" $fontHead $navy 130 1718 300 44
    DrawText $g "แยก Public/Internal ชัดเจน • Role-based Access • Cache ลดการเรียกซ้ำ • Proxy กลางสำหรับ AI และ API ภายนอก • พร้อมทดสอบและ Deploy จริง" $fontBody $text 130 1766 820 58 "Center"
    SaveCanvas $bmp $g "02-system-architecture.png"
}

function Generate3 {
    $c = NewCanvas; $bmp = $c[0]; $g = $c[1]
    DrawHeader $g "ระบบงานหลักที่รองรับภารกิจเกษตรจังหวัด" "ออกแบบตามกลุ่มงานจริง และเชื่อมกลับสู่ Dashboard กลาง"
    DrawDashboardMock $g 315 760 450 340
    DrawText $g "NPT Smart Agri Dashboard" $fontHead $navy 310 690 460 54 "Center"
    $mods = @(
        @{t="ฝ่ายบริหารทั่วไป"; c=$slate; x=72; y=390; b=@("บุคลากร","พัสดุ / ครุภัณฑ์","งบประมาณ","ผู้ใช้ระบบ","Audit Log")},
        @{t="ยุทธศาสตร์และสารสนเทศ"; c=$sky; x=568; y=390; b=@("ทะเบียนเกษตรกร","GIS / พื้นที่","ศูนย์เรียนรู้","อากาศ / ภัยพิบัติ")},
        @{t="ส่งเสริมการผลิต"; c=$gold; x=72; y=1115; b=@("แปลงใหญ่","มาตรฐาน GAP","ผลผลิตพืช","มะพร้าวน้ำหอม")},
        @{t="พัฒนาเกษตรกร"; c=$green; x=568; y=1115; b=@("วิสาหกิจชุมชน","Smart Farmer / YSF","กลุ่มอาชีพ","ท่องเที่ยวเชิงเกษตร")},
        @{t="อารักขาพืช"; c=$orange; x=72; y=1420; b=@("แปลงพยากรณ์","ศัตรูพืชชุมชน","ดินปุ๋ยชุมชน","Hotspot / PM2.5")},
        @{t="คำขอข้อมูลและชุมชน"; c=$teal; x=568; y=1420; b=@("Data Request","Assignment รายอำเภอ","CSV / Excel Import","Farmer Forum")}
    )
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, $green), 4)
    foreach ($m in $mods) {
        $cx = $m.x + 220; $cy = $m.y + 126
        $g.DrawLine($pen, 540, 930, $cx, $cy)
    }
    $pen.Dispose()
    foreach ($m in $mods) {
        $rect = [System.Drawing.Rectangle]::new($m.x, $m.y, 440, 245)
        FillRound $g $rect ([System.Drawing.Color]::FromArgb(248,255,255,255)) 28
        StrokeRound $g $rect ([System.Drawing.Color]::FromArgb(110, $m.c)) 28 3
        DrawText $g $m.t $fontHead $m.c ($m.x + 28) ($m.y + 26) 380 42
        DrawBulletList $g $m.b ($m.x + 32) ($m.y + 82) 375 $fontSmall $text $m.c
    }
    FillRound $g ([System.Drawing.Rectangle]::new(92, 1730, 896, 108)) ([System.Drawing.Color]::FromArgb(34, $green)) 24
    DrawText $g "ผลลัพธ์: ข้อมูลถูกแบ่งตามเจ้าของงาน แต่เชื่อมกลับสู่ Dashboard กลาง เพื่อวิเคราะห์ภาพรวมจังหวัดได้ทันที" $fontBody $navy 120 1756 840 58 "Center"
    SaveCanvas $bmp $g "03-module-map.png"
}

function Generate4 {
    $c = NewCanvas; $bmp = $c[0]; $g = $c[1]
    DrawHeader $g "ฟังก์ชันเด่นของระบบ" "เปลี่ยนข้อมูลดิบให้ใช้งานได้จริง ผ่าน Dashboard, แผนที่, การค้นหา, AI และระบบจัดการข้อมูล"
    DrawDashboardMock $g 220 560 640 520
    $features = @(
        @{t="Dashboard รวมข้อมูล"; d="สรุปตัวเลข กราฟ และสถานะตามกลุ่มงาน"; c=$green},
        @{t="Smart Map / GIS"; d="ดูรายอำเภอ พิกัดพื้นที่ และชั้นข้อมูลเชิงพื้นที่"; c=$sky},
        @{t="Global Search"; d="ค้นหาคำเดียว เจอข้อมูลข้ามหลายตาราง"; c=$gold},
        @{t="AI Chatbot น้องข้าวหลาม"; d="ถามด้วยภาษาธรรมชาติ ให้ AI ช่วยสรุป"; c=$violet},
        @{t="CRUD + Import / Export"; d="เพิ่ม แก้ ลบ นำเข้า CSV/Excel และส่งออกรายงาน"; c=$teal},
        @{t="Live Widgets"; d="ข่าว อากาศ AQI ราคาเกษตร เขื่อน และ Hotspot"; c=$orange},
        @{t="Data Request Workflow"; d="จังหวัดสร้างคำขอ อำเภอกรอก ระบบรวมผล"; c=$slate},
        @{t="Executive Situation Room"; d="Alert, risk ranking, งบประมาณ และสรุปด้วย AI"; c=$navy}
    )
    for ($i=0; $i -lt 8; $i++) {
        $col = $i % 2
        $row = [math]::Floor($i / 2)
        $x = if ($col -eq 0) { 72 } else { 562 }
        $y = 1140 + $row * 150
        $f = $features[$i]
        $rect = [System.Drawing.Rectangle]::new($x, $y, 446, 124)
        FillRound $g $rect ([System.Drawing.Color]::FromArgb(248,255,255,255)) 24
        StrokeRound $g $rect ([System.Drawing.Color]::FromArgb(100, $f.c)) 24 3
        FillRound $g ([System.Drawing.Rectangle]::new($x+22, $y+30, 54, 54)) ([System.Drawing.Color]::FromArgb(34, $f.c)) 18
        DrawText $g ([string]($i+1)) $fontHead $f.c ($x+22) ($y+36) 54 44 "Center"
        DrawText $g $f.t $fontSmall $f.c ($x+92) ($y+22) 320 28
        DrawText $g $f.d $fontTiny $text ($x+92) ($y+56) 320 56
    }
    FillRound $g ([System.Drawing.Rectangle]::new(92, 1760, 896, 84)) ([System.Drawing.Color]::FromArgb(36, $green)) 24
    DrawText $g "ระบบเดียว ครอบคลุมการดูข้อมูล วิเคราะห์ ค้นหา จัดการ และสื่อสารผล" $fontBody $navy 130 1785 820 38 "Center"
    SaveCanvas $bmp $g "04-key-features.png"
}

function Generate5 {
    $c = NewCanvas; $bmp = $c[0]; $g = $c[1]
    DrawHeader $g "ประโยชน์ของระบบ" "ข้อมูลพร้อมใช้ ตัดสินใจเร็วขึ้น ทำงานร่วมกันง่ายขึ้น และต่อยอดเป็นต้นแบบได้"
    $groups = @(
        @{t="ผู้บริหาร"; c=$navy; y=390; b=@("เห็นภาพรวมจังหวัดได้เร็ว","ใช้ข้อมูลประกอบการตัดสินใจ","จัดลำดับพื้นที่และประเด็นเร่งด่วน","ติดตามงบประมาณ คำขอข้อมูล และความเสี่ยง")},
        @{t="เจ้าหน้าที่"; c=$green; y=760; b=@("ลดเวลารวบรวมไฟล์และทำรายงานซ้ำ","ค้นหาข้อมูลข้ามหมวดได้ในที่เดียว","เพิ่ม / แก้ไข / นำเข้า / ส่งออกข้อมูลสะดวก","ให้ AI ช่วยสรุปคำตอบและเตรียมข้อมูลงาน")},
        @{t="ประชาชนและภาคี"; c=$sky; y=1130; b=@("เข้าถึงข้อมูลสาธารณะได้ง่าย","เพิ่มความโปร่งใสของข้อมูลภาครัฐ","เห็นข่าวสาร อากาศ AQI และราคาเกษตร","สนับสนุนการมีส่วนร่วมของภาคีในพื้นที่")}
    )
    foreach ($grp in $groups) {
        $rect = [System.Drawing.Rectangle]::new(82, $grp.y, 916, 305)
        FillRound $g $rect ([System.Drawing.Color]::FromArgb(248,255,255,255)) 30
        StrokeRound $g $rect ([System.Drawing.Color]::FromArgb(105, $grp.c)) 30 3
        FillRound $g ([System.Drawing.Rectangle]::new(120, $grp.y+48, 150, 150)) ([System.Drawing.Color]::FromArgb(32, $grp.c)) 36
        DrawText $g $grp.t $fontHead $grp.c 300 ($grp.y+35) 620 48
        DrawBulletList $g $grp.b 300 ($grp.y+94) 640 $fontBody $text $grp.c
    }
    DrawText $g "ผลลัพธ์เชิงระบบ" $fontHead $navy 94 1498 420 44
    $outs = @("ข้อมูลรวมศูนย์","ลดงาน Manual","ตัดสินใจจากข้อมูลจริง","เชื่อมแผนที่และพื้นที่","ใช้ AI ช่วยวิเคราะห์","พร้อมขยายผล")
    for ($i=0; $i -lt 6; $i++) {
        $x = 92 + ($i % 2) * 460
        $y = 1562 + [math]::Floor($i / 2) * 72
        DrawPill $g $outs[$i] $x $y 400 @($green,$gold,$sky,$teal,$violet,$orange)[$i]
    }
    FillRound $g ([System.Drawing.Rectangle]::new(92, 1782, 896, 76)) ([System.Drawing.Color]::FromArgb(40, $gold)) 24
    DrawText $g "NPT Smart Agri Dashboard ไม่ใช่แค่เว็บแสดงข้อมูล แต่เป็นโครงสร้างพื้นฐานด้านข้อมูลเกษตรระดับจังหวัด" $fontBody $navy 124 1802 832 38 "Center"
    SaveCanvas $bmp $g "05-benefits-impact.png"
}

$paths = @()
$paths += Generate1
$paths += Generate2
$paths += Generate3
$paths += Generate4
$paths += Generate5
$paths | ForEach-Object { Write-Output $_ }
