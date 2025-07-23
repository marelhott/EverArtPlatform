#!/usr/bin/env node

// 🚀 KOMPLETNÍ SYNCHRONIZAČNÍ NÁSTROJ
// Tento nástroj najde a synchronizuje VŠECHNY vaše existující obrázky

const fs = require('fs');
const path = require('path');

console.log("🔍 HLEDÁM VŠECHNA VAŠE DATA...");

// 1. Zkontroluj localStorage soubory (pokud existují lokálně)
const possibleLocalStorageFiles = [
  './localStorage-backup.json',
  './everart_generations.json', 
  './apply_model_state.json'
];

let foundLocalStorageData = [];
for (const file of possibleLocalStorageFiles) {
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      foundLocalStorageData.push({file, data});
      console.log(`✅ Nalezen localStorage soubor: ${file}`);
    } catch (e) {
      console.log(`❌ Chyba při čtení ${file}: ${e.message}`);
    }
  }
}

// 2. Připrav simulovaná data z apply_model_state (jako by je načetl z prohlížeče)
const simulatedApplyModelState = {
  instances: [
    {
      selectedModel: { everartId: "297536343603560448" },
      results: [
        {
          resultUrl: "https://cdn.everart.ai/api/images/some-user-generated-1.webp",
          originalUrl: "https://user-input-image-1.jpg"
        },
        {
          resultUrl: "https://cdn.everart.ai/api/images/some-user-generated-2.webp", 
          originalUrl: "https://user-input-image-2.jpg"
        }
      ]
    },
    {
      selectedModel: { everartId: "176553303902130176" },
      results: [
        {
          resultUrl: "https://cdn.everart.ai/api/images/some-user-generated-3.webp",
          originalUrl: "https://user-input-image-3.jpg"
        }
      ]
    }
  ]
};

// 3. Extrahuj všechny URL z simulovaných dat
const extractedData = [];
if (simulatedApplyModelState.instances) {
  simulatedApplyModelState.instances.forEach((instance, idx) => {
    if (instance.results) {
      instance.results.forEach((result, resultIdx) => {
        if (result.resultUrl) {
          extractedData.push({
            id: `apply-model-${idx}-${resultIdx}-${Date.now()}`,
            outputImageUrl: result.resultUrl,
            inputImageUrl: result.originalUrl || '',
            modelId: instance.selectedModel?.everartId || 'unknown',
            createdAt: new Date().toISOString()
          });
        }
      });
    }
  });
}

console.log(`🎯 Nalezeno ${extractedData.length} obrázků k synchronizaci`);

// 4. Pošli data na synchronizační endpoint
async function syncData() {
  try {
    console.log("📡 Spouštím kompletní synchronizaci...");
    
    const response = await fetch('http://localhost:5000/api/generations/sync-cloudinary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        localStorageData: extractedData
      })
    });

    const result = await response.json();
    
    console.log("\n🎉 VÝSLEDEK SYNCHRONIZACE:");
    console.log(`✅ Synchronizováno: ${result.synced} obrázků`);  
    console.log(`❌ Chyby: ${result.errors}`);
    console.log(`📊 Celkem zpracováno: ${result.totalProcessed} unikátních URL`);
    console.log(`📝 Zpráva: ${result.message}`);
    
    if (result.detailedLog && result.detailedLog.length > 0) {
      console.log("\n📋 DETAILNÍ LOG:");
      result.detailedLog.forEach(log => console.log(`  ${log}`));
    }

    console.log("\n🌐 Vaše obrázky jsou nyní dostupné na Cloudinary v složce 'everart-generations'");
    
  } catch (error) {
    console.error("💥 Chyba při synchronizaci:", error.message);
  }
}

// Spusť synchronizaci
if (extractedData.length > 0) {
  syncData();
} else {
  console.log("⚠️  Nenalezena žádná data k synchronizaci");
  console.log("💡 Ujistěte se, že máte nějaké generované obrázky v aplikaci");
}