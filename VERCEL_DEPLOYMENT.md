# 🚀 Nasazení EverArt Platform na Vercel

## Příprava před nasazením

### 1. Databáze (POVINNÉ)
Potřebujete PostgreSQL databázi. Doporučené bezplatné možnosti:

**Neon (DOPORUČENO):**
- Jděte na https://neon.tech
- Vytvořte účet a novou databázi
- Zkopírujte connection string

**Supabase:**
- Jděte na https://supabase.com
- Vytvořte projekt
- V Settings > Database najděte connection string

### 2. GitHub repository
- Nahrajte kód na GitHub (pokud ještě není)
- Ujistěte se, že máte všechny soubory commitnuté

## Nasazení na Vercel

### Krok 1: Vytvoření Vercel účtu
1. Jděte na https://vercel.com
2. Přihlaste se pomocí GitHub účtu
3. Klikněte na "New Project"

### Krok 2: Import projektu
1. Vyberte váš GitHub repository
2. Vercel automaticky detekuje framework
3. Klikněte na "Deploy"

### Krok 3: Nastavení Environment Variables
V Vercel dashboardu:
1. Jděte do Settings > Environment Variables
2. Přidejte tyto proměnné:

```
DATABASE_URL=postgresql://username:password@hostname:port/database
EVERART_API_KEY=everart-Ec0-3NNDOk-RiqRq1n574d-grIX2izOUjlCZSGEy9cQ
SESSION_SECRET=your-strong-random-session-secret-here
NODE_ENV=production
```

**Volitelné (pro Cloudinary):**
```
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### Krok 4: Inicializace databáze
Po nasazení:
1. V Vercel dashboardu jděte do Functions
2. Najděte server function a otevřete logs
3. Nebo použijte Vercel CLI:
```bash
npm i -g vercel
vercel login
vercel env pull
npm run db:push
```

## Ověření nasazení

1. Otevřete vaši Vercel URL
2. Zkontrolujte, že se aplikace načte
3. Otestujte generování obrázků
4. Zkontrolujte logs v případě problémů

## Možné problémy a řešení

### Problém: Database connection error
**Řešení:** Zkontrolujte DATABASE_URL v environment variables

### Problém: API timeout
**Řešení:** Vercel má limit 60s pro serverless functions (už nastaveno)

### Problém: Build error
**Řešení:** Zkontrolujte logs a ujistěte se, že všechny dependencies jsou v package.json

## Automatické nasazení
- Každý push do main branch automaticky spustí nové nasazení
- Preview nasazení pro pull requesty

## Monitoring
- Vercel Analytics pro sledování výkonu
- Function logs pro debugging
- Real-time metrics v dashboardu

## Náklady
- **Hobby plan**: Zdarma
  - 100GB bandwidth/měsíc
  - Serverless functions
  - Automatické HTTPS
  - Custom domains

- **Pro plan**: $20/měsíc
  - Více bandwidth
  - Delší function timeout
  - Pokročilé analytics

---

**Hotovo!** 🎉 Vaše aplikace je nyní dostupná na internetu zdarma!