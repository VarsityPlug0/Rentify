$sourceDir = "c:\Users\money\Downloads\images_2026-01-17_19-30-09"
$miscDir = Join-Path $sourceDir "_Misc"

# Ensure Misc directory exists
if (-not (Test-Path $miscDir)) {
    New-Item -ItemType Directory -Path $miscDir | Out-Null
}

$files = Get-ChildItem -Path $sourceDir -File

foreach ($file in $files) {
    # Skip the script itself if it's in the folder (though I'm saving this to a temp location usually, better safe)
    if ($file.Name -eq "organize_images.ps1") { continue }

    $destFolder = ""
    
    # Matching pattern: Name up to the optional " (n)" or just the extension
    # Regex: Start, capture everything lazy until... (space followed by (digit) OR dot)
    if ($file.Name -match "^(.+?)(\s\(\d+\))?\.(jpg|jpeg|png|webp|svg)$") {
        $propName = $matches[1]
        
        # Check if it looks like a property listing (starts with Apartment_, Double-storey_, Retirement_)
        if ($propName -match "^(Apartment|Double-storey|Retirement)_.*") {
             $destFolder = Join-Path $sourceDir $propName
        } else {
             # It's a logo or miscellaneous image
             $destFolder = $miscDir
        }
    } else {
        # Fallback for weird files
        $destFolder = $miscDir
    }

    # Create destination folder if it doesn't exist
    if (-not (Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder | Out-Null
    }

    # Move the file
    $destPath = Join-Path $destFolder $file.Name
    Move-Item -Path $file.FullName -Destination $destPath -Force
    Write-Host "Moved $($file.Name) to $destFolder"
}

Write-Host "Organization complete."
