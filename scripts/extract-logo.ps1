Add-Type -AssemblyName System.Drawing
$imgPath = "C:\Users\LENOVO\.gemini\antigravity-ide\brain\83ddeee3-7110-4a58-8d2d-d477209f5327\.user_uploaded\media_1792458952411.jpg"
$img = [System.Drawing.Bitmap]::FromFile($imgPath)

$minX = 16
$maxX = 119
$minY = 14
$maxY = 87

$w = $maxX - $minX + 1
$h = $maxY - $minY + 1

# Create smooth anti-aliased PNG
$crop = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

# Tisera Red RGB
$redR = 200
$redG = 16
$redB = 25

for ($cy = 0; $cy -lt $h; $cy++) {
    for ($cx = 0; $cx -lt $w; $cx++) {
        $p = $img.GetPixel($minX + $cx, $minY + $cy)
        
        # Calculate how "not-white" and "red" the pixel is
        # Background is white (R~255, G~255, B~255)
        # Red logo is (R~200, G~16, B~25)
        $whiteness = ($p.G + $p.B) / (2.0 * 255.0)
        $alpha = [Math]::Max(0.0, [Math]::Min(1.0, (1.0 - $whiteness) * 1.25))
        
        if ($alpha -gt 0.05) {
            $aInt = [int]([Math]::Round($alpha * 255.0))
            if ($aInt -gt 255) { $aInt = 255 }
            $crop.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb($aInt, $redR, $redG, $redB))
        } else {
            $crop.SetPixel($cx, $cy, [System.Drawing.Color]::Transparent)
        }
    }
}

$outPng = "d:\Project\Tiga Serangkai\microservice-lookup\storage\templates\logo_td.png"
$crop.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
$crop.Dispose()
Write-Host "Saved smooth transparent logo to $outPng"
