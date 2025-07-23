// 🚨 TESTOVACÍ SKRIPT - spusťte v console prohlížeče pro synchronizaci

console.log('🔍 Hledám vaše localStorage data...');

// Prohledej všechny localStorage klíče
const allKeys = Object.keys(localStorage);
console.log('Nalezené localStorage klíče:', allKeys);

let allData = [];

allKeys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value && value !== 'null' && value !== '{}' && value !== '[]') {
    try {
      const parsed = JSON.parse(value);
      console.log(`📋 Klíč "${key}":`, parsed);
      
      // Extrahuj obrázky z apply_model_state
      if (key === 'apply_model_state' && parsed.instances) {
        parsed.instances.forEach((instance, idx) => {
          if (instance.results && Array.isArray(instance.results)) {
            instance.results.forEach((result, resultIdx) => {
              if (result.resultUrl) {
                allData.push({
                  id: `${key}-${idx}-${resultIdx}`,
                  outputImageUrl: result.resultUrl,
                  inputImageUrl: result.originalUrl || '',
                  modelId: instance.selectedModel?.everartId || 'unknown',
                  source: key
                });
              }
            });
          }
        });
      }
      
      // Extrahuj z arrays
      if (Array.isArray(parsed)) {
        parsed.forEach((item, idx) => {
          if (item.outputImageUrl || item.resultUrl) {
            allData.push({
              id: `${key}-${idx}`,
              outputImageUrl: item.outputImageUrl || item.resultUrl,
              inputImageUrl: item.inputImageUrl || '',
              modelId: item.modelId || 'unknown',
              source: key
            });
          }
        });
      }
    } catch (e) {
      console.log(`⚠️ Nelze parsovat ${key}:`, e.message);
    }
  }
});

console.log(`🎯 CELKEM NALEZENO: ${allData.length} obrázků k synchronizaci`);

if (allData.length > 0) {
  console.log('📡 Spouštím synchronizaci...');
  
  fetch('/api/generations/sync-cloudinary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      localStorageData: allData
    })
  })
  .then(response => response.json())
  .then(result => {
    console.log('✅ SYNCHRONIZACE DOKONČENA:');
    console.log(`✅ Nahráno: ${result.synced} obrázků`);
    console.log(`❌ Chyby: ${result.errors}`);
    console.log(`📊 Zpracováno: ${result.totalProcessed}`);
    console.log(`📝 ${result.message}`);
    
    if (result.detailedLog) {
      console.log('🔍 Detail:', result.detailedLog);
    }
  })
  .catch(error => {
    console.error('💥 Chyba při synchronizaci:', error);
  });
} else {
  console.log('❌ Žádná data k synchronizaci nenalezena');
  console.log('💡 Zkontrolujte, zda máte nějaké generované obrázky v aplikaci');
}