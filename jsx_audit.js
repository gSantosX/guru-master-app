const fs = require('fs');

function checkBalance(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const openDivs = (content.match(/<div /g) || []).length;
    const closeDivs = (content.match(/<\/div>/g) || []).length;
    const openMotion = (content.match(/<motion.div /g) || []).length;
    const closeMotion = (content.match(/<\/motion.div>/g) || []).length;
    const openHeader = (content.match(/<header/g) || []).length;
    const closeHeader = (content.match(/<\/header>/g) || []).length;
    
    console.log(`File: ${filePath}`);
    console.log(`Divs: ${openDivs} / ${closeDivs}`);
    console.log(`MotionDivs: ${openMotion} / ${closeMotion}`);
    console.log(`Headers: ${openHeader} / ${closeHeader}`);
    
    if (openDivs !== closeDivs) console.warn("!!! DIV MISMATCH !!!");
    if (openMotion !== closeMotion) console.warn("!!! MOTION MISMATCH !!!");
    if (openHeader !== closeHeader) console.warn("!!! HEADER MISMATCH !!!");
}

const files = [
    'src/tabs/ScriptTab.jsx',
    'src/tabs/ReadyScriptsTab.jsx',
    'src/tabs/ChannelMonitoringTab.jsx',
    'src/tabs/VideoCoverTab.jsx',
    'src/tabs/ImagePromptsTab.jsx',
    'src/tabs/ChannelMiningTab.jsx'
];

files.forEach(f => {
    try {
        checkBalance(f);
    } catch (e) {
        console.error(`Could not read ${f}`);
    }
});
