# Cloudinary Setup a Synchronizace - Status

## 🔧 Současný stav

### Problém s Cloudinary synchronizací
- **Chyba**: "Invalid extension in transformation: auto"
- **Příčina**: Cloudinary API má problém s některými URL parametry
- **Testováno**: Odstranění `quality: 'auto'` a `format: 'auto'` parametrů

### Co funguje
✅ **Delete funkce** - Modely se mazají pouze lokálně
✅ **Multi-model interface** - Unified checkbox selection
✅ **Database operations** - Storage funguje správně

### Co nefunguje  
❌ **Cloudinary sync** - Upload selhává kvůli transformaci

## 📋 EverArt API - Odpověď na dotaz o sloučených modelech

### ❌ **Sloučené modely NEJSOU podporované**

EverArt API **nepodporuje** aplikování více modelů současně na jeden obrázek s různými vlivy. Každý model funguje **nezávisle**.

### Možnosti:
1. **Současná implementace** ✅ - Více modelů = více samostatných generací
2. **Alternativní řešení** - Post-processing blending (vyžaduje externí nástroje)
3. **Custom model training** - Natrénovat jeden model kombinující více stylů

### Technické důvody:
- EverArt API přijímá pouze `modelId` (single string)
- Žádný parametr pro ensemble generation
- Každé volání API = jedna generace s jedním modelem

## 🎯 Doporučení
Pro uživatele: Současný multi-model systém je správný - generuje více verzí obrázku s různými styly současně.