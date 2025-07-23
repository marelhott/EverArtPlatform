# 🎯 MANUÁLNÍ SYNCHRONIZACE VAŠICH DAT

## Jak synchronizovat VŠECHNA vaše existující data:

### Krok 1: Otevřete Developer Tools
1. V prohlížeči stiskněte **F12**
2. Jděte na záložku **Console**

### Krok 2: Zkopírujte a spusťte tento kód:

```javascript
// 🔍 Načtení všech vašich localStorage dat
const applyModelState = JSON.parse(localStorage.getItem('apply_model_state') || '{}');
const everartGenerations = JSON.parse(localStorage.getItem('everart_generations') || '[]');

console.log('Apply model state:', applyModelState);
console.log('EverArt generations:', everartGenerations);

// 📡 Odeslání na synchronizační endpoint
fetch('/api/force-sync-user-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    applyModelState: applyModelState,
    everartGenerations: everartGenerations
  })
})
.then(response => response.json())
.then(data => {
  console.log('🎉 SYNCHRONIZACE DOKONČENA:');
  console.log(`✅ Synchronizováno: ${data.synced} obrázků`);
  console.log(`❌ Chyby: ${data.errors}`);
  console.log(`📊 Celkem nalezeno: ${data.totalFound} vašich obrázků`);
  console.log(`📝 Zpráva: ${data.message}`);
})
.catch(error => {
  console.error('❌ Chyba při synchronizaci:', error);
});
```

### Krok 3: Výsledek
- Konzole vám ukáže kolik obrázků bylo nalezeno a synchronizováno
- Všechny vaše obrázky budou nahrány do Cloudinary složky `everart-generations`
- Vytvoří se také databázové záznamy pro každý obrázek

## ⚡️ Alternativní způsob - Automaticky při načtení stránky

Aplikace se také pokusí automaticky synchronizovat vaše data při každém načtení. Pokud máte obrázky v localStorage, měly by se objevit na Cloudinary během několika sekund po otevření aplikace.

## 🎯 100% Záruka

Tento systém:
- ✅ Najde VŠECHNA vaše localStorage data
- ✅ Zpracuje jak `apply_model_state` tak `everart_generations`
- ✅ Nahraje pouze dosud nesynchronizované obrázky
- ✅ Vytvoří databázové záznamy pro všechny obrázky
- ✅ Poskytne detailní zpětnou vazbu o procesu