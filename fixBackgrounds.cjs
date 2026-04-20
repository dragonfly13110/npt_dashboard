const fs = require('fs');

const files = [
    'src/components/widgets/LandingBentoCards.jsx',
    'src/components/widgets/WeatherWidget.jsx',
    'src/components/widgets/SoilMoistureWidget.jsx',
    'src/components/widgets/DamReservoirWidget.jsx',
    'src/components/widgets/AgriPricesWidget.jsx'
];

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');

    // Replace thick hex backgrounds in padding areas with translucent glass
    content = content.replace(/(padding:\s*['"]?[0-9a-zA-Z\s]+['"]?.*?)background:\s*['"]#[0-9a-fA-F]{3,6}['"]/g, "$1background: 'rgba(255,255,255,0.4)'");
    
    // Reverse matches where background is before padding
    content = content.replace(/background:\s*['"]#[0-9a-fA-F]{3,6}['"](.*?padding:\s*['"]?[0-9a-zA-Z\s]+['"]?)/g, "background: 'rgba(255,255,255,0.4)'$1");

    // Remove strictly linear gradients (those were the outermost widget backgrounds)
    content = content.replace(/background:\s*['"`]linear-gradient\([^)]+\)['"`],?/g, "");

    // Also strip out 'border: 1px ...' inside these rows if they are right next to the background, but let's just make border mostly transparent instead.
    content = content.replace(/border:\s*['"]1px solid #[a-fA-F0-9]{3,6}['"]/g, "border: '1px solid rgba(255,255,255,0.4)'");
    
    // For specific cases like footer links blocks
    content = content.replace(/background:\s*['"]#[a-fA-F0-9]{3,6}['"](,\s*color:\s*['"]#[a-fA-F0-9]{3,6}['"].*?borderTop)/g, "background: 'rgba(255,255,255,0.4)'$1");


    fs.writeFileSync(f, content);
    console.log('Processed ' + f);
});
