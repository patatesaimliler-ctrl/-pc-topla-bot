const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================================================
   AYARLAR
========================================================= */

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const REEF_KEY = process.env.REEF_KEY;

if (!DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN eksik");
}

if (!REEF_KEY) {
  throw new Error("REEF_KEY eksik");
}

const sessions = new Map();

/*
 * Kullanıcının bütçesinin maksimum ne kadar aşılabileceği.
 *
 * Örnek:
 * 75.000 TL -> 90.000 TL
 * 80.000 TL -> 95.000 TL
 * 100.000 TL -> 115.000 TL
 */
const MAX_EXTRA_BUDGET = 15000;


/* =========================================================
   OYUNLAR
========================================================= */

const GAMES = {
  valorant: {
    name: "VALORANT",
    cpuWeight: 1.25,
    gpuWeight: 0.80
  },

  cs2: {
    name: "CS2",
    cpuWeight: 1.20,
    gpuWeight: 0.90
  },

  minecraft: {
    name: "Minecraft",
    cpuWeight: 1.15,
    gpuWeight: 0.90
  },

  fortnite: {
    name: "Fortnite",
    cpuWeight: 1.00,
    gpuWeight: 1.05
  },

  gta5: {
    name: "GTA V",
    cpuWeight: 0.95,
    gpuWeight: 1.10
  },

  rdr2: {
    name: "Red Dead Redemption 2",
    cpuWeight: 0.90,
    gpuWeight: 1.25
  },

  fc: {
    name: "EA SPORTS FC",
    cpuWeight: 1.00,
    gpuWeight: 1.00
  },

  cyberpunk: {
    name: "Cyberpunk 2077",
    cpuWeight: 0.85,
    gpuWeight: 1.40
  }
};


/* =========================================================
   CPU HAVUZU
========================================================= */

const CPU = {
  amd: [
    {
      name: "Ryzen 5 5500",
      query: "AMD Ryzen 5 5500",
      tier: 1
    },

    {
      name: "Ryzen 5 5600",
      query: "AMD Ryzen 5 5600",
      tier: 2
    },

    {
      name: "Ryzen 5 7500F",
      query: "AMD Ryzen 5 7500F",
      tier: 3
    },

    {
      name: "Ryzen 5 7600",
      query: "AMD Ryzen 5 7600",
      tier: 4
    },

    {
      name: "Ryzen 7 7700",
      query: "AMD Ryzen 7 7700",
      tier: 4
    },

    {
      name: "Ryzen 7 7800X3D",
      query: "AMD Ryzen 7 7800X3D",
      tier: 5
    }
  ],

  intel: [
    {
      name: "Intel Core i3-12100F",
      query: "Intel Core i3 12100F",
      tier: 1
    },

    {
      name: "Intel Core i5-12400F",
      query: "Intel Core i5 12400F",
      tier: 2
    },

    {
      name: "Intel Core i5-13400F",
      query: "Intel Core i5 13400F",
      tier: 3
    },

    {
      name: "Intel Core i5-14400F",
      query: "Intel Core i5 14400F",
      tier: 4
    },

    {
      name: "Intel Core i5-14600KF",
      query: "Intel Core i5 14600KF",
      tier: 5
    },

    {
      name: "Intel Core i7-14700F",
      query: "Intel Core i7 14700F",
      tier: 5
    }
  ]
};


/* =========================================================
   GPU HAVUZU
========================================================= */

const GPU = {
  nvidia: [
    {
      name: "RTX 3050 8GB",
      query: "RTX 3050 8GB",
      tier: 1
    },

    {
      name: "RTX 4060 8GB",
      query: "RTX 4060 8GB",
      tier: 2
    },

    {
      name: "RTX 5060 8GB",
      query: "RTX 5060 8GB",
      tier: 3
    },

    {
      name: "RTX 5060 Ti 8GB",
      query: "RTX 5060 Ti 8GB",
      tier: 4
    },

    {
      name: "RTX 5060 Ti 16GB",
      query: "RTX 5060 Ti 16GB",
      tier: 4
    },

    {
      name: "RTX 5070 12GB",
      query: "RTX 5070 12GB",
      tier: 5
    },

    {
      name: "RTX 5070 Ti 16GB",
      query: "RTX 5070 Ti 16GB",
      tier: 6
    },

    {
      name: "RTX 5080 16GB",
      query: "RTX 5080 16GB",
      tier: 7
    }
  ],

  amd: [
    {
      name: "RX 6600 8GB",
      query: "RX 6600 8GB",
      tier: 1
    },

    {
      name: "RX 7600 8GB",
      query: "RX 7600 8GB",
      tier: 2
    },

    {
      name: "RX 9060 XT 8GB",
      query: "RX 9060 XT 8GB",
      tier: 3
    },

    {
      name: "RX 9060 XT 16GB",
      query: "RX 9060 XT 16GB",
      tier: 4
    },

    {
      name: "RX 7700 XT 12GB",
      query: "RX 7700 XT 12GB",
      tier: 4
    },

    {
      name: "RX 7800 XT 16GB",
      query: "RX 7800 XT 16GB",
      tier: 5
    },

    {
      name: "RX 9070 XT 16GB",
      query: "RX 9070 XT 16GB",
      tier: 6
    },

    {
      name: "RX 7900 XTX 24GB",
      query: "RX 7900 XTX 24GB",
      tier: 7
    }
  ]
};


/* =========================================================
   YARDIMCI
========================================================= */

function money(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}


/* =========================================================
   CPU PLATFORMU
========================================================= */

function platformForCPU(cpu) {

  if (
    cpu.includes("7500F") ||
    cpu.includes("7600") ||
    cpu.includes("7700") ||
    cpu.includes("7800X3D")
  ) {
    return "am5";
  }

  if (
    cpu.includes("5500") ||
    cpu.includes("5600")
  ) {
    return "am4";
  }

  return "lga1700";
}


/* =========================================================
   REEF API
========================================================= */

async function reefSearch(query) {

  const response = await fetch(
    "https://api.reefapi.com/trendyol/v1/search",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-api-key": REEF_KEY
      },

      body: JSON.stringify({
        query,
        page: 1,
        max_pages: 1,
        sort: "price_asc"
      })
    }
  );

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Reef JSON hatası: ${text.slice(0, 300)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Reef ${response.status}: ${
        data?.message || text
      }`
    );
  }

  return (
    data?.data?.results ||
    data?.results ||
    data?.data ||
    []
  );
}


/* =========================================================
   ÜRÜN BİLGİLERİ
========================================================= */

function getTitle(product) {

  return (
    product.title ||
    product.name ||
    product.productName ||
    product.product_title ||
    ""
  );
}


function getUrl(product) {

  return (
    product.url ||
    product.productUrl ||
    product.link ||
    product.productLink ||
    null
  );
}


function getPrice(product) {

  const values = [
    product.price,
    product.salePrice,
    product.discountedPrice,
    product.currentPrice,
    product.sellingPrice
  ];

  for (const value of values) {

    if (
      typeof value === "number" &&
      value > 0
    ) {
      return value;
    }

    if (
      typeof value === "string"
    ) {

      const cleaned = value
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

      const number = Number(cleaned);

      if (
        Number.isFinite(number) &&
        number > 0
      ) {
        return number;
      }
    }
  }

  return null;
}


/* =========================================================
   ÜRÜN DOĞRULAMA
========================================================= */

function validProduct(title, type) {

  const t = normalize(title);

  if (!t) return false;


  if (type === "cpu") {

    return (
      t.includes("ryzen") ||
      t.includes("core i") ||
      t.includes("core ultra")
    );
  }


  if (type === "gpu") {

    return (
      t.includes("rtx ") ||
      t.includes("rx ") ||
      t.includes("geforce") ||
      t.includes("radeon")
    );
  }


  if (type === "ram") {

    return (
      (
        t.includes("ram") ||
        t.includes("ddr4") ||
        t.includes("ddr5")
      ) &&
      !t.includes("laptop")
    );
  }


  if (type === "ssd") {

    return (
      (
        t.includes("ssd") ||
        t.includes("nvme")
      ) &&
      !t.includes("kutu") &&
      !t.includes("adapt") &&
      !t.includes("case") &&
      !t.includes("hard disk kutu")
    );
  }


  if (type === "motherboard") {

    return (
      t.includes("anakart") ||
      t.includes("motherboard") ||
      t.includes("b550") ||
      t.includes("b650") ||
      t.includes("b850") ||
      t.includes("b760") ||
      t.includes("b860") ||
      t.includes("z790") ||
      t.includes("z890")
    );
  }


  if (type === "psu") {

    return (
      t.includes("psu") ||
      t.includes("power supply") ||
      t.includes("guc kaynagi")
    );
  }


  if (type === "case") {

    return (
      t.includes("kasa") ||
      t.includes("pc case") ||
      t.includes("gaming case")
    );
  }


  return true;
}


/* =========================================================
   REEF'TEN ADAY ÜRÜNLER
========================================================= */

async function findProducts(
  query,
  type
) {

  const results =
    await reefSearch(query);

  return results
    .map(product => ({
      title: getTitle(product),
      price: getPrice(product),
      url: getUrl(product),
      brand:
        product.brand ||
        product.merchantName ||
        "Trendyol"
    }))
    .filter(product =>
      product.price &&
      validProduct(
        product.title,
        type
      )
    )
    .sort(
      (a, b) =>
        a.price - b.price
    )
    .slice(0, 8);
}


/* =========================================================
   TIER HESABI
========================================================= */

function targetTier(
  budget,
  game
) {

  const profile =
    GAMES[game];

  let tier;

  if (budget < 35000) {
    tier = 1;
  }

  else if (budget < 50000) {
    tier = 2;
  }

  else if (budget < 65000) {
    tier = 3;
  }

  else if (budget < 80000) {
    tier = 4;
  }

  else if (budget < 110000) {
    tier = 5;
  }

  else if (budget < 150000) {
    tier = 6;
  }

  else {
    tier = 7;
  }


  if (
    profile.gpuWeight >= 1.25
  ) {
    tier += 0.5;
  }


  if (
    profile.cpuWeight >= 1.20
  ) {
    tier += 0.25;
  }


  return Math.max(
    1,
    Math.min(
      7,
      tier
    )
  );
}


/* =========================================================
   UYUMLULUK KONTROLLERİ
========================================================= */

function compatibleRAM(
  platform,
  product
) {

  const t =
    normalize(product.title);

  if (platform === "am4") {
    return t.includes("ddr4");
  }

  if (platform === "am5") {
    return t.includes("ddr5");
  }

  return t.includes("ddr5");
}


function compatibleMotherboard(
  platform,
  product
) {

  const t =
    normalize(product.title);

  if (platform === "am4") {

    return (
      t.includes("b450") ||
      t.includes("b550") ||
      t.includes("a520")
    );
  }

  if (platform === "am5") {

    return (
      t.includes("a620") ||
      t.includes("b650") ||
      t.includes("b850") ||
      t.includes("x670") ||
      t.includes("x870")
    );
  }

  return (
    t.includes("b660") ||
    t.includes("b760") ||
    t.includes("b860") ||
    t.includes("z690") ||
    t.includes("z790") ||
    t.includes("z890")
  );
}


/* =========================================================
   GÜÇ KAYNAĞI İHTİYACI
========================================================= */

function requiredPSU(gpu) {

  const t =
    normalize(gpu.title);

  if (
    t.includes("5080") ||
    t.includes("5070 ti") ||
    t.includes("7900 xtx")
  ) {
    return 850;
  }

  if (
    t.includes("5070") ||
    t.includes("9070")
  ) {
    return 750;
  }

  return 650;
}


/* =========================================================
   EN UYGUN ÜRÜNÜ SEÇ
========================================================= */

function cheapest(
  list,
  maxPrice = Infinity
) {

  return (
    list
      .filter(
        product =>
          product.price <= maxPrice
      )
      .sort(
        (a, b) =>
          a.price - b.price
      )[0] ||
    null
  );
}


/* =========================================================
   SİSTEM OLUŞTUR
========================================================= */

async function makeBuild(session) {

  const budget =
    Number(session.budget);

  /*
   * ANA KURAL:
   *
   * Kullanıcı bütçesi + 15.000 TL.
   *
   * Örnek:
   * 75K -> 90K
   * 80K -> 95K
   */

  const maximum =
    budget + MAX_EXTRA_BUDGET;


  const cpuPool =
    CPU[session.cpu];

  const gpuPool =
    GPU[session.gpu];


  const wantedTier =
    targetTier(
      budget,
      session.game
    );


  /*
   * En mantıklı CPU'ları seç.
   */

  const cpuCandidates =
    [...cpuPool]
      .sort(
        (a, b) =>
          Math.abs(
            a.tier - wantedTier
          ) -
          Math.abs(
            b.tier - wantedTier
          )
      )
      .slice(0, 4);


  /*
   * En mantıklı GPU'ları seç.
   */

  const gpuCandidates =
    [...gpuPool]
      .sort(
        (a, b) =>
          Math.abs(
            a.tier - wantedTier
          ) -
          Math.abs(
            b.tier - wantedTier
          )
      )
      .slice(0, 5);


  console.log(
    `🔎 Bütçe: ${budget} TL`
  );

  console.log(
    `🔒 Maksimum: ${maximum} TL`
  );

  console.log(
    `🎮 Oyun: ${session.game}`
  );


  /*
   * CPU fiyatlarını bul.
   */

  const cpuProducts =
    await Promise.all(
      cpuCandidates.map(
        cpu =>
          findProducts(
            cpu.query,
            "cpu"
          )
            .then(products => ({
              cpu,
              products
            }))
            .catch(error => {
              console.error(
                "CPU arama:",
                error.message
              );

              return {
                cpu,
                products: []
              };
            })
      )
    );


  /*
   * GPU fiyatlarını bul.
   */

  const gpuProducts =
    await Promise.all(
      gpuCandidates.map(
        gpu =>
          findProducts(
            gpu.query,
            "gpu"
          )
            .then(products => ({
              gpu,
              products
            }))
            .catch(error => {
              console.error(
                "GPU arama:",
                error.message
              );

              return {
                gpu,
                products: []
              };
            })
      )
    );


  /*
   * En ucuz uygun CPU/GPU adaylarını
   * çıkarıyoruz.
   */

  const cpuOptions = [];

  for (
    const item of cpuProducts
  ) {

    for (
      const product
      of item.products
    ) {

      cpuOptions.push({
        ...product,
        cpu: item.cpu
      });
    }
  }


  const gpuOptions = [];

  for (
    const item of gpuProducts
  ) {

    for (
      const product
      of item.products
    ) {

      gpuOptions.push({
        ...product,
        gpu: item.gpu
      });
    }
  }


  /*
   * En iyi kombinasyonları oluştur.
   */

  const combinations = [];

  for (
    const cpu of cpuOptions
  ) {

    for (
      const gpu of gpuOptions
    ) {

      const platform =
        platformForCPU(
          cpu.cpu.name
        );

      /*
       * Oyun ağırlığına göre skor.
       */

      const profile =
        GAMES[session.game];

      const score =
        Math.abs(
          cpu.cpu.tier -
          wantedTier
        ) +

        Math.abs(
          gpu.gpu.tier -
          wantedTier
        ) +

        (
          profile.cpuWeight >= 1.2
            ? -cpu.cpu.tier * 0.08
            : 0
        ) +

        (
          profile.gpuWeight >= 1.2
            ? -gpu.gpu.tier * 0.08
            : 0
        );


      combinations.push({
        cpu,
        gpu,
        platform,
        score
      });
    }
  }


  combinations.sort(
    (a, b) =>
      a.score - b.score
  );


  /*
   * En fazla 8 CPU/GPU kombinasyonu
   * deniyoruz.
   */

  for (
    const combination
    of combinations.slice(0, 8)
  ) {

    try {

      const {
        cpu,
        gpu,
        platform
      } = combination;


      /*
       * Kalan bütçeyi hesapla.
       */

      const remaining =
        maximum -
        cpu.price -
        gpu.price;


      /*
       * Destek parçaları için
       * Reef araması.
       */

      const ramQuery =
        platform === "am4"
          ? "16GB 2x8 DDR4 3200 RAM"
          : "32GB 2x16 DDR5 6000 RAM";


      const motherboardQuery =
        platform === "am4"
          ? "B550 DDR4 AM4 anakart"
          : platform === "am5"
            ? "B650 DDR5 AM5 anakart"
            : "B760 DDR5 anakart";


      const psuWatts =
        requiredPSU(gpu);


      const psuQuery =
        `${psuWatts}W 80 Plus Gold PSU`;


      const ssdQuery =
        budget >= 60000
          ? "1TB NVMe SSD"
          : "500GB NVMe SSD";


      const caseQuery =
        "ATX Mesh Airflow Gaming Kasa";


      const [
        ramProducts,
        ssdProducts,
        motherboardProducts,
        psuProducts,
        caseProducts
      ] =
        await Promise.all([

          findProducts(
            ramQuery,
            "ram"
          ),

          findProducts(
            ssdQuery,
            "ssd"
          ),

          findProducts(
            motherboardQuery,
            "motherboard"
          ),

          findProducts(
            psuQuery,
            "psu"
          ),

          findProducts(
            caseQuery,
            "case"
          )

        ]);


      /*
       * Uyumlu ürünleri seç.
       */

      const ram =
        ramProducts.find(
          product =>
            compatibleRAM(
              platform,
              product
            )
        );


      const motherboard =
        motherboardProducts.find(
          product =>
            compatibleMotherboard(
              platform,
              product
            )
        );


      const psu =
        cheapest(
          psuProducts
        );


      const ssd =
        cheapest(
          ssdProducts
        );


      const pcCase =
        cheapest(
          caseProducts
        );


      if (
        !ram ||
        !ssd ||
        !motherboard ||
        !psu ||
        !pcCase
      ) {
        continue;
      }


      const parts = [

        [
          "🧠 İşlemci",
          cpu
        ],

        [
          "🎮 Ekran Kartı",
          gpu
        ],

        [
          "🧩 RAM",
          ram
        ],

        [
          "💾 SSD",
          ssd
        ],

        [
          "🔧 Anakart",
          motherboard
        ],

        [
          "⚡ PSU",
          psu
        ],

        [
          "📦 Kasa",
          pcCase
        ]

      ];


      const total =
        parts.reduce(
          (sum, [, product]) =>
            sum + product.price,
          0
        );


      /*
       * ASIL BÜTÇE KİLİDİ
       *
       * 75K + 15K = 90K
       *
       * 90K üstüne çıkarsa
       * sistem direkt reddedilir.
       */

      if (
        total > maximum
      ) {
        console.log(
          `❌ Kombinasyon bütçeyi geçti: ${money(total)}`
        );

        continue;
      }


      /*
       * Sistem bulundu.
       */

      console.log(
        `✅ Sistem bulundu: ${money(total)}`
      );


      return {

        parts,

        total,

        cpu:
          cpu.title,

        gpu:
          gpu.title,

        maximum

      };

    }

    catch (error) {

      console.error(
        "Aday sistem hatası:",
        error.message
      );

    }

  }


  return null;
}


/* =========================================================
   PANEL
========================================================= */

function panel(session) {

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🖥️ PC TOPLA")
      .setDescription(

        "Seçimlerini yap, sonra " +
        "**PC'Yİ OLUŞTUR** butonuna bas.\n\n" +

        `💰 **Bütçe:** ${
          session.budget
            ? money(session.budget)
            : "Seçilmedi"
        }\n` +

        `📈 **Maksimum:** ${
          session.budget
            ? money(
                session.budget +
                MAX_EXTRA_BUDGET
              )
            : "Bütçe + 15.000 TL"
        }\n` +

        `🎮 **Oyun:** ${
          session.game
            ? GAMES[
                session.game
              ].name
            : "Seçilmedi"
        }\n` +

        `🧠 **CPU:** ${
          session.cpu === "amd"
            ? "AMD"
            : "Intel"
        }\n` +

        `🎮 **GPU:** ${
          session.gpu === "nvidia"
            ? "NVIDIA"
            : "AMD"
        }\n\n` +

        "💡 Sistem bütçeyi mümkün olduğunca " +
        "aşmamaya çalışır. Gerekirse maksimum " +
        "**15.000 TL** esneklik kullanabilir."
      );


  const row1 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("budget")
          .setLabel("💰 Bütçe")
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId("game")
          .setLabel("🎮 Oyun")
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId("cpu")
          .setLabel(
            session.cpu === "amd"
              ? "🧠 AMD"
              : "🧠 Intel"
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId("gpu")
          .setLabel(
            session.gpu === "nvidia"
              ? "🎮 NVIDIA"
              : "🎮 AMD"
          )
          .setStyle(
            ButtonStyle.Secondary
          )

      );


  const row2 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("create")
          .setLabel(
            "🚀 PC'Yİ OLUŞTUR"
          )
          .setStyle(
            ButtonStyle.Success
          )

      );


  return {
    embeds: [embed],
    components: [
      row1,
      row2
    ]
  };
}


/* =========================================================
   SLASH COMMAND
========================================================= */

const commands = [

  new SlashCommandBuilder()
    .setName("pctopla")
    .setDescription(
      "Bütçene ve oyununa göre PC oluştur."
    )

].map(
  command =>
    command.toJSON()
);


const rest =
  new REST({
    version: "10"
  }).setToken(
    DISCORD_TOKEN
  );


/* =========================================================
   READY
========================================================= */

client.once(
  "ready",
  async () => {

    console.log(
      `🤖 Bot aktif: ${client.user.tag}`
    );

    try {

      await rest.put(
        Routes.applicationCommands(
          client.user.id
        ),
        {
          body: commands
        }
      );

      console.log(
        "✅ /pctopla hazır."
      );

    }

    catch (error) {

      console.error(
        "Komut kayıt hatası:",
        error
      );

    }

  }
);


/* =========================================================
   INTERACTIONS
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {

    try {

      /* =====================================================
         /pctopla
      ===================================================== */

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName ===
          "pctopla"
      ) {

        const session = {

          budget: null,

          game: null,

          cpu: "amd",

          gpu: "nvidia"

        };


        sessions.set(
          interaction.user.id,
          session
        );


        await interaction.reply(
          panel(session)
        );


        return;
      }


      /* =====================================================
         BUTONLAR
      ===================================================== */

      if (
        interaction.isButton()
      ) {

        const session =
          sessions.get(
            interaction.user.id
          );


        if (!session) {

          await interaction.reply({

            content:
              "❌ Oturum bulunamadı. `/pctopla` ile yeniden başla.",

            ephemeral: true

          });

          return;
        }


        /* ===================================================
           BÜTÇE
        =================================================== */

        if (
          interaction.customId ===
          "budget"
        ) {

          const modal =
            new ModalBuilder()
              .setCustomId(
                "budget_modal"
              )
              .setTitle(
                "💰 Bütçeni Gir"
              );


          const input =
            new TextInputBuilder()
              .setCustomId(
                "budget_input"
              )
              .setLabel(
                "Maksimum bütçe (TL)"
              )
              .setPlaceholder(
                "Örn: 75000"
              )
              .setStyle(
                TextInputStyle.Short
              )
              .setRequired(true);


          modal.addComponents(

            new ActionRowBuilder()
              .addComponents(
                input
              )

          );


          await interaction.showModal(
            modal
          );


          return;
        }


        /* ===================================================
           OYUN
        =================================================== */

        if (
          interaction.customId ===
          "game"
        ) {

          const menu =
            new StringSelectMenuBuilder()
              .setCustomId(
                "game_select"
              )
              .setPlaceholder(
                "🎮 Oyun seç"
              )
              .addOptions(

                Object.entries(
                  GAMES
                ).map(
                  ([value, game]) => ({

                    label:
                      game.name,

                    value,

                    emoji: "🎮"

                  })
                )

              );


          await interaction.reply({

            content:
              "🎮 Oynayacağın oyunu seç:",

            components: [

              new ActionRowBuilder()
                .addComponents(
                  menu
                )

            ],

            ephemeral: true

          });


          return;
        }


        /* ===================================================
           CPU
        =================================================== */

        if (
          interaction.customId ===
          "cpu"
        ) {

          const menu =
            new StringSelectMenuBuilder()
              .setCustomId(
                "cpu_select"
              )
              .setPlaceholder(
                "🧠 CPU markası"
              )
              .addOptions(

                {
                  label: "AMD",
                  value: "amd",
                  emoji: "🧠"
                },

                {
                  label: "Intel",
                  value: "intel",
                  emoji: "🧠"
                }

              );


          await interaction.reply({

            content:
              "🧠 İşlemci markasını seç:",

            components: [

              new ActionRowBuilder()
                .addComponents(
                  menu
                )

            ],

            ephemeral: true

          });


          return;
        }


        /* ===================================================
           GPU
        =================================================== */

        if (
          interaction.customId ===
          "gpu"
        ) {

          const menu =
            new StringSelectMenuBuilder()
              .setCustomId(
                "gpu_select"
              )
              .setPlaceholder(
                "🎮 GPU markası"
              )
              .addOptions(

                {
                  label: "NVIDIA",
                  value: "nvidia",
                  emoji: "🎮"
                },

                {
                  label: "AMD",
                  value: "amd",
                  emoji: "🎮"
                }

              );


          await interaction.reply({

            content:
              "🎮 Ekran kartı markasını seç:",

            components: [

              new ActionRowBuilder()
                .addComponents(
                  menu
                )

            ],

            ephemeral: true

          });


          return;
        }


        /* ===================================================
           PC OLUŞTUR
        =================================================== */

        if (
          interaction.customId ===
          "create"
        ) {

          if (
            !session.budget
          ) {

            await interaction.reply({

              content:
                "💰 Önce bütçeni gir.",

              ephemeral: true

            });

            return;
          }


          if (
            !session.game
          ) {

            await interaction.reply({

              content:
                "🎮 Önce oyun seç.",

              ephemeral: true

            });

            return;
          }


          await interaction.update({

            embeds: [

              new EmbedBuilder()
                .setColor(
                  0xf1c40f
                )
                .setTitle(
                  "🔎 PC ARAŞTIRILIYOR..."
                )
                .setDescription(

                  `🎮 **${
                    GAMES[
                      session.game
                    ].name
                  }**\n` +

                  `💰 **Bütçe:** ${
                    money(
                      session.budget
                    )
                  }\n` +

                  `📈 **Maksimum:** ${
                    money(
                      session.budget +
                      MAX_EXTRA_BUDGET
                    )
                  }\n\n` +

                  "🧠 İşlemci aranıyor...\n" +

                  "🎮 Ekran kartı aranıyor...\n" +

                  "🛒 ReefAPI canlı fiyatları kontrol ediliyor...\n" +

                  "🔧 Parça uyumluluğu kontrol ediliyor...\n" +

                  "💰 Son bütçe kontrolü yapılıyor..."

                )

            ],

            components: []

          });


          const result =
            await makeBuild(
              session
            );


          /* =================================================
             BULUNAMADI
          ================================================= */

          if (!result) {

            await interaction.editReply({

              embeds: [

                new EmbedBuilder()
                  .setColor(
                    0xed4245
                  )
                  .setTitle(
                    "❌ UYGUN SİSTEM BULUNAMADI"
                  )
                  .setDescription(

                    "ReefAPI'deki canlı ürünlerde " +
                    "uygun parçalarla sistem oluşturamadım.\n\n" +

                    `💰 **Bütçe:** ${
                      money(
                        session.budget
                      )
                    }\n` +

                    `📈 **İzin verilen maksimum:** ${
                      money(
                        session.budget +
                        MAX_EXTRA_BUDGET
                      )
                    }\n\n` +

                    "💡 Başka bir CPU/GPU markası " +
                    "veya daha yüksek bütçe deneyebilirsin."

                  )

              ],

              components: []

            });


            return;
          }


          /* =================================================
             SONUÇ
          ================================================= */

          const remaining =
            session.budget -
            result.total;


          const overBudget =
            result.total >
            session.budget;


          const embed =
            new EmbedBuilder()
              .setColor(
                overBudget
                  ? 0xf1c40f
                  : 0x57f287
              )
              .setTitle(
                "🚀 PC HAZIR!"
              )
              .setDescription(

                `🎮 **Oyun:** ${
                  GAMES[
                    session.game
                  ].name
                }\n` +

                `🧠 **CPU tercihi:** ${
                  session.cpu ===
                  "amd"
                    ? "AMD"
                    : "Intel"
                }\n` +

                `🎮 **GPU tercihi:** ${
                  session.gpu ===
                  "nvidia"
                    ? "NVIDIA"
                    : "AMD"
                }\n\n` +

                `💰 **Bütçe:** ${
                  money(
                    session.budget
                  )
                }\n` +

                `📈 **İzin verilen maksimum:** ${
                  money(
                    result.maximum
                  )
                }\n` +

                `💵 **Toplam:** ${
                  money(
                    result.total
                  )
                }\n\n` +

                (
                  overBudget

                    ? `🟡 **Bütçenin ${
                        money(
                          result.total -
                          session.budget
                        )
                      } üzerinde**`

                    : `🟢 **Bütçenin ${
                        money(
                          session.budget -
                          result.total
                        )
                      } altında**`
                )

              );


          /* =================================================
             PARÇALAR
          ================================================= */

          for (
            const [
              name,
              product
            ]
            of result.parts
          ) {

            embed.addFields({

              name,

              value:

                `**${
                  product.title
                }**\n` +

                `💰 ${
                  money(
                    product.price
                  )
                }\n` +

                `🏪 ${
                  product.brand
                }\n` +

                (
                  product.url
                    ? `[🛒 Ürünü görüntüle](${
                        product.url
                      })`
                    : "🔗 Link bulunamadı"
                ),

              inline: false

            });

          }


          /* =================================================
             120K+ MİZAH
          ================================================= */

          if (
            session.budget >=
            120000
          ) {

            embed.addFields({

              name:
                "💀 120K+ Bölgesi",

              value:
                "Bu bütçede artık ekran kartı " +
                "sistemi değil, sistemi ekran kartı seçiyor.",

              inline: false

            });

          }


          await interaction.editReply({

            embeds: [
              embed
            ],

            components: []

          });


          return;
        }

      }


      /* =====================================================
         SELECT MENÜLER
      ===================================================== */

      if (
        interaction.isStringSelectMenu()
      ) {

        const session =
          sessions.get(
            interaction.user.id
          );


        if (!session) {

          await interaction.reply({

            content:
              "❌ Oturum bulunamadı.",

            ephemeral: true

          });

          return;
        }


        /* OYUN */

        if (
          interaction.customId ===
          "game_select"
        ) {

          session.game =
            interaction.values[0];


          await interaction.update({

            content:
              `✅ Oyun: **${
                GAMES[
                  session.game
                ].name
              }**`,

            components: []

          });


          return;
        }


        /* CPU */

        if (
          interaction.customId ===
          "cpu_select"
        ) {

          session.cpu =
            interaction.values[0];


          await interaction.update({

            content:
              `✅ CPU: **${
                session.cpu ===
                "amd"
                  ? "AMD"
                  : "Intel"
              }**`,

            components: []

          });


          return;
        }


        /* GPU */

        if (
          interaction.customId ===
          "gpu_select"
        ) {

          session.gpu =
            interaction.values[0];


          await interaction.update({

            content:
              `✅ GPU: **${
                session.gpu ===
                "nvidia"
                  ? "NVIDIA"
                  : "AMD"
              }**`,

            components: []

          });


          return;
        }

      }


      /* =====================================================
         BÜTÇE MODALI
      ===================================================== */

      if (
        interaction.isModalSubmit() &&
        interaction.customId ===
          "budget_modal"
      ) {

        const session =
          sessions.get(
            interaction.user.id
          );


        if (!session) {

          await interaction.reply({

            content:
              "❌ Oturum bulunamadı. `/pctopla` ile yeniden başla.",

            ephemeral: true

          });

          return;
        }


        const raw =
          interaction.fields
            .getTextInputValue(
              "budget_input"
            );


        const budget =
          Number(
            raw.replace(
              /\D/g,
              ""
            )
          );


        if (
          !Number.isFinite(
            budget
          ) ||
          budget < 10000 ||
          budget > 500000
        ) {

          await interaction.reply({

            content:
              "❌ Bütçe 10.000 - 500.000 TL arasında olmalı.",

            ephemeral: true

          });

          return;
        }


        session.budget =
          Math.floor(
            budget
          );


        await interaction.reply({

          content:

            `✅ Bütçe **${
              money(budget)
            }** olarak ayarlandı.\n` +

            `📈 Gerekirse sistem **${
              money(
                budget +
                MAX_EXTRA_BUDGET
              )
            }** seviyesine kadar çıkabilir.`,

          ephemeral: true

        });


        return;
      }

    }

    catch (error) {

      console.error(
        "INTERACTION ERROR:",
        error
      );


      try {

        if (
          interaction.replied ||
          interaction.deferred
        ) {

          await interaction.followUp({

            content:
              "❌ Bir hata oluştu. Railway Logs'u kontrol et.",

            ephemeral: true

          });

        }

        else {

          await interaction.reply({

            content:
              "❌ Bir hata oluştu.",

            ephemeral: true

          });

        }

      }

      catch {}

    }

  }
);


/* =========================================================
   LOGIN
========================================================= */

client.login(
  DISCORD_TOKEN
);