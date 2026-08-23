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

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const REEF_KEY = process.env.REEF_KEY;

if (!DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN eksik");
}

if (!REEF_KEY) {
  throw new Error("REEF_KEY eksik");
}

const sessions = new Map();

/* =========================================================
   OYUNLAR
========================================================= */

const GAMES = {
  valorant: {
    name: "VALORANT",
    weightCPU: 1.25,
    weightGPU: 0.80
  },

  cs2: {
    name: "CS2",
    weightCPU: 1.20,
    weightGPU: 0.90
  },

  minecraft: {
    name: "Minecraft",
    weightCPU: 1.15,
    weightGPU: 0.90
  },

  fortnite: {
    name: "Fortnite",
    weightCPU: 1.00,
    weightGPU: 1.05
  },

  gta5: {
    name: "GTA V",
    weightCPU: 0.95,
    weightGPU: 1.10
  },

  rdr2: {
    name: "Red Dead Redemption 2",
    weightCPU: 0.90,
    weightGPU: 1.25
  },

  fc: {
    name: "EA SPORTS FC",
    weightCPU: 1.00,
    weightGPU: 1.00
  },

  cyberpunk: {
    name: "Cyberpunk 2077",
    weightCPU: 0.85,
    weightGPU: 1.40
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
      tier: 1,
      priceShare: 0.18
    },

    {
      name: "Ryzen 5 5600",
      query: "AMD Ryzen 5 5600",
      tier: 2,
      priceShare: 0.20
    },

    {
      name: "Ryzen 5 7500F",
      query: "AMD Ryzen 5 7500F",
      tier: 3,
      priceShare: 0.20
    },

    {
      name: "Ryzen 5 7600",
      query: "AMD Ryzen 5 7600",
      tier: 4,
      priceShare: 0.22
    },

    {
      name: "Ryzen 7 7800X3D",
      query: "AMD Ryzen 7 7800X3D",
      tier: 5,
      priceShare: 0.25
    }
  ],

  intel: [
    {
      name: "Intel Core i3-12100F",
      query: "Intel Core i3 12100F",
      tier: 1,
      priceShare: 0.18
    },

    {
      name: "Intel Core i5-12400F",
      query: "Intel Core i5 12400F",
      tier: 2,
      priceShare: 0.20
    },

    {
      name: "Intel Core i5-14400F",
      query: "Intel Core i5 14400F",
      tier: 3,
      priceShare: 0.21
    },

    {
      name: "Intel Core i5-14600KF",
      query: "Intel Core i5 14600KF",
      tier: 4,
      priceShare: 0.24
    },

    {
      name: "Intel Core i7-14700F",
      query: "Intel Core i7 14700F",
      tier: 5,
      priceShare: 0.27
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
      tier: 1,
      priceShare: 0.30
    },

    {
      name: "RTX 4060 8GB",
      query: "RTX 4060 8GB",
      tier: 2,
      priceShare: 0.32
    },

    {
      name: "RTX 4060 Ti 8GB",
      query: "RTX 4060 Ti 8GB",
      tier: 3,
      priceShare: 0.35
    },

    {
      name: "RTX 5070 12GB",
      query: "RTX 5070 12GB",
      tier: 4,
      priceShare: 0.40
    },

    {
      name: "RTX 5070 Ti 16GB",
      query: "RTX 5070 Ti 16GB",
      tier: 5,
      priceShare: 0.44
    },

    {
      name: "RTX 5080 16GB",
      query: "RTX 5080 16GB",
      tier: 6,
      priceShare: 0.50
    }
  ],

  amd: [
    {
      name: "RX 6600 8GB",
      query: "RX 6600 8GB",
      tier: 1,
      priceShare: 0.29
    },

    {
      name: "RX 7600 8GB",
      query: "RX 7600 8GB",
      tier: 2,
      priceShare: 0.31
    },

    {
      name: "RX 7700 XT 12GB",
      query: "RX 7700 XT 12GB",
      tier: 3,
      priceShare: 0.35
    },

    {
      name: "RX 7800 XT 16GB",
      query: "RX 7800 XT 16GB",
      tier: 4,
      priceShare: 0.40
    },

    {
      name: "RX 9070 XT 16GB",
      query: "RX 9070 XT 16GB",
      tier: 5,
      priceShare: 0.44
    },

    {
      name: "RX 7900 XTX 24GB",
      query: "RX 7900 XTX 24GB",
      tier: 6,
      priceShare: 0.50
    }
  ]
};

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
        sort: "default"
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
    []
  );
}

/* =========================================================
   ÜRÜN BİLGİLERİ
========================================================= */

function getPrice(product) {
  const values = [
    product.price,
    product.salePrice,
    product.discountedPrice,
    product.currentPrice
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

function getTitle(product) {
  return (
    product.title ||
    product.name ||
    product.productName ||
    ""
  );
}

function getUrl(product) {
  return (
    product.url ||
    product.productUrl ||
    product.link ||
    null
  );
}

/* =========================================================
   NORMALIZE
========================================================= */

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
   REEF ÜRÜN FİLTRESİ
========================================================= */

function validProduct(title, type) {

  const t = normalize(title);

  /* CPU */

  if (type === "cpu") {

    const cpu =
      t.includes("ryzen") ||
      t.includes("core i") ||
      t.includes("core ultra");

    if (!cpu) {
      return false;
    }

    if (
      t.includes("sogutucu") ||
      t.includes("cooler") ||
      t.includes("termal macun") ||
      t.includes("fan")
    ) {
      return false;
    }

    return true;
  }

  /* GPU */

  if (type === "gpu") {

    const gpu =
      t.includes("rtx") ||
      t.includes("rx ") ||
      t.includes("geforce") ||
      t.includes("radeon");

    if (!gpu) {
      return false;
    }

    if (
      t.includes("laptop") ||
      t.includes("notebook") ||
      t.includes("kablo") ||
      t.includes("fan") ||
      t.includes("stand")
    ) {
      return false;
    }

    return true;
  }

  /* RAM */

  if (type === "ram") {

    const ram =
      t.includes("ram") ||
      t.includes("ddr4") ||
      t.includes("ddr5");

    if (!ram) {
      return false;
    }

    if (
      t.includes("laptop") ||
      t.includes("notebook") ||
      t.includes("sodimm")
    ) {
      return false;
    }

    return true;
  }

  /* SSD */

  if (type === "ssd") {

    if (!t.includes("ssd")) {
      return false;
    }

    if (
      t.includes("kutu") ||
      t.includes("adaptör") ||
      t.includes("adapter") ||
      t.includes("enclosure")
    ) {
      return false;
    }

    /* Çok küçük SSD'leri engelle */

    if (
      t.includes("120gb") ||
      t.includes("128gb") ||
      t.includes("240gb") ||
      t.includes("256gb")
    ) {
      return false;
    }

    return true;
  }

  /* ANAKART */

  if (type === "motherboard") {

    return (
      t.includes("anakart") ||
      t.includes("motherboard") ||
      t.includes("b450") ||
      t.includes("b550") ||
      t.includes("a520") ||
      t.includes("a620") ||
      t.includes("b650") ||
      t.includes("b760") ||
      t.includes("z790") ||
      t.includes("z890")
    );
  }

  /* PSU */

  if (type === "psu") {

    return (
      t.includes("psu") ||
      t.includes("power supply") ||
      t.includes("guc kaynagi")
    );
  }

  /* KASA */

  if (type === "case") {

    const kasa =
      t.includes("kasa") ||
      t.includes("pc case") ||
      t.includes("gaming case");

    if (!kasa) {
      return false;
    }

    /* Sadece fanı kasa sanmasın */

    if (
      t.includes("fan 1 adet") ||
      t.includes("12cm fan") ||
      t.includes("120mm fan") ||
      t.includes("140mm fan") ||
      t.includes("kasa ici fan") ||
      t.includes("molex")
    ) {
      return false;
    }

    return true;
  }

  return true;
}

/* =========================================================
   REEF'TEN UYGUN FİYAT BUL
========================================================= */

async function findPrice(
  query,
  type,
  maxPrice
) {

  const results =
    await reefSearch(query);

  const products = results
    .map(product => ({
      title: getTitle(product),
      price: getPrice(product),
      url: getUrl(product),
      brand:
        product.brand ||
        product.merchantName ||
        "Trendyol"
    }))

    .filter(product => {

      if (!product.price) {
        return false;
      }

      if (
        product.price > maxPrice
      ) {
        return false;
      }

      if (
        !validProduct(
          product.title,
          type
        )
      ) {
        return false;
      }

      return true;
    })

    .sort(
      (a, b) =>
        a.price - b.price
    );

  return products[0] || null;
}

/* =========================================================
   CPU PLATFORMU
========================================================= */

function platformForCPU(cpu) {

  if (
    cpu.includes("7500F") ||
    cpu.includes("7600") ||
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
   OYUN TIER
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

  else {
    tier = 6;
  }

  if (
    profile.weightGPU >= 1.25
  ) {
    tier += 0.5;
  }

  if (
    profile.weightCPU >= 1.20
  ) {
    tier += 0.25;
  }

  return Math.min(
    6,
    Math.max(1, tier)
  );
}

/* =========================================================
   ADAY SİSTEM
========================================================= */

function buildCandidate(
  session,
  cpu,
  gpu
) {

  const budget =
    session.budget;

  const platform =
    platformForCPU(
      cpu.name
    );

  const cpuPriceLimit =
    Math.floor(
      budget *
      cpu.priceShare
    );

  const gpuPriceLimit =
    Math.floor(
      budget *
      gpu.priceShare
    );

  /* RAM */

  let ram;

  if (
    platform === "am4" ||
    budget < 50000
  ) {

    ram = {
      query:
        "16GB DDR4 3200 RAM",
      type: "ram",
      max:
        Math.floor(
          budget * 0.10
        )
    };

  } else {

    ram = {
      query:
        "32GB DDR5 6000 RAM",
      type: "ram",
      max:
        Math.floor(
          budget * 0.12
        )
    };
  }

  /* SSD */

  const ssd = {
    query:
      budget >= 60000
        ? "1TB NVMe SSD"
        : "500GB NVMe SSD",

    type: "ssd",

    max:
      Math.floor(
        budget * 0.08
      )
  };

  /* ANAKART */

  let motherboard;

  if (
    platform === "am4"
  ) {

    motherboard = {
      query:
        "B550 DDR4 anakart",

      type:
        "motherboard",

      max:
        Math.floor(
          budget * 0.10
        )
    };

  }

  else if (
    platform === "am5"
  ) {

    motherboard = {
      query:
        "B650 DDR5 anakart",

      type:
        "motherboard",

      max:
        Math.floor(
          budget * 0.11
        )
    };

  }

  else {

    motherboard = {
      query:
        "B760 DDR5 anakart",

      type:
        "motherboard",

      max:
        Math.floor(
          budget * 0.11
        )
    };
  }

  /* PSU */

  const psu = {
    query:
      gpu.tier >= 5
        ? "850W 80 Plus Gold PSU"
        : gpu.tier >= 3
          ? "750W 80 Plus Gold PSU"
          : "650W 80 Plus Bronze PSU",

    type: "psu",

    max:
      Math.floor(
        budget * 0.10
      )
  };

  /* KASA */

  const pcCase = {
    query:
      "Mesh Airflow ATX Gaming Kasa",

    type:
      "case",

    max:
      Math.floor(
        budget * 0.09
      )
  };

  return {

    cpu: {
      query: cpu.query,
      type: "cpu",
      max: cpuPriceLimit
    },

    gpu: {
      query: gpu.query,
      type: "gpu",
      max: gpuPriceLimit
    },

    ram,

    ssd,

    motherboard,

    psu,

    case: pcCase
  };
}

/* =========================================================
   SİSTEM OLUŞTUR
========================================================= */

async function makeBuild(
  session
) {

  const cpuList =
    CPU[session.cpu];

  const gpuList =
    GPU[session.gpu];

  const wanted =
    targetTier(
      session.budget,
      session.game
    );

  const combinations = [];

  for (
    const cpu of cpuList
  ) {

    for (
      const gpu of gpuList
    ) {

      const distance =
        Math.abs(
          cpu.tier -
          wanted
        ) +
        Math.abs(
          gpu.tier -
          wanted
        );

      combinations.push({
        cpu,
        gpu,
        distance
      });
    }
  }

  combinations.sort(
    (a, b) =>
      a.distance -
      b.distance
  );

  /*
   * Eskiden sadece 5 adaydı.
   * Şimdi 15 aday deniyoruz.
   */

  for (
    const candidate
    of combinations.slice(0, 15)
  ) {

    try {

      const plan =
        buildCandidate(
          session,
          candidate.cpu,
          candidate.gpu
        );

      const [
        cpu,
        gpu,
        ram,
        ssd,
        motherboard,
        psu,
        pcCase
      ] = await Promise.all([

        findPrice(
          plan.cpu.query,
          plan.cpu.type,
          plan.cpu.max
        ),

        findPrice(
          plan.gpu.query,
          plan.gpu.type,
          plan.gpu.max
        ),

        findPrice(
          plan.ram.query,
          plan.ram.type,
          plan.ram.max
        ),

        findPrice(
          plan.ssd.query,
          plan.ssd.type,
          plan.ssd.max
        ),

        findPrice(
          plan.motherboard.query,
          plan.motherboard.type,
          plan.motherboard.max
        ),

        findPrice(
          plan.psu.query,
          plan.psu.type,
          plan.psu.max
        ),

        findPrice(
          plan.case.query,
          plan.case.type,
          plan.case.max
        )

      ]);

      if (
        !cpu ||
        !gpu ||
        !ram ||
        !ssd ||
        !motherboard ||
        !psu ||
        !pcCase
      ) {
        continue;
      }

      const parts = [

        ["🧠 İşlemci", cpu],

        ["🎮 Ekran Kartı", gpu],

        ["🧩 RAM", ram],

        ["💾 SSD", ssd],

        ["🔧 Anakart", motherboard],

        ["⚡ PSU", psu],

        ["📦 Kasa", pcCase]

      ];

      const total =
        parts.reduce(
          (sum, [, product]) =>
            sum +
            product.price,
          0
        );

      /*
       * =====================================================
       * BÜTÇE SİSTEMİ
       *
       * Kullanıcının bütçesi + 15.000 TL maksimum.
       *
       * Örnek:
       * 75K -> 90K maksimum
       * 80K -> 95K maksimum
       * 135K -> 150K maksimum
       * =====================================================
       */

      const maxAllowed =
        session.budget +
        15000;

      if (
        total > maxAllowed
      ) {
        continue;
      }

      return {

        parts,

        total,

        cpu:
          candidate.cpu.name,

        gpu:
          candidate.gpu.name

      };

    }

    catch (error) {

      console.error(
        "Aday sistem hatası:",
        error.message
      );

      continue;
    }
  }

  return null;
}

/* =========================================================
   PARA FORMAT
========================================================= */

function money(value) {

  return `${Math.round(
    value
  ).toLocaleString(
    "tr-TR"
  )} TL`;
}

/* =========================================================
   ANA PANEL
========================================================= */

function panel(session) {

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)

      .setTitle(
        "🖥️ PC TOPLA"
      )

      .setDescription(

        "Aşağıdaki butonlardan seçimlerini yap.\n" +
        "Seçimler **PC'Yİ OLUŞTUR** butonuna basana kadar gönderilmez.\n\n" +

        `💰 **Bütçe:** ${
          session.budget
            ? money(
                session.budget
              )
            : "Seçilmedi"
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
        }`

      );

  const row1 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            "budget"
          )
          .setLabel(
            "💰 Bütçe"
          )
          .setStyle(
            ButtonStyle.Primary
          ),

        new ButtonBuilder()
          .setCustomId(
            "game"
          )
          .setLabel(
            "🎮 Oyun"
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            "cpu"
          )
          .setLabel(
            `🧠 ${
              session.cpu === "amd"
                ? "AMD"
                : "Intel"
            }`
          )
          .setStyle(
            ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId(
            "gpu"
          )
          .setLabel(
            `🎮 ${
              session.gpu === "nvidia"
                ? "NVIDIA"
                : "AMD"
            }`
          )
          .setStyle(
            ButtonStyle.Secondary
          )

      );

  const row2 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            "create"
          )
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
    .setName(
      "pctopla"
    )
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
  })
    .setToken(
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
   INTERACTION
========================================================= */

client.on(
  "interactionCreate",
  async interaction => {

    try {

      /* =====================================================
         /PCTOPLA
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

                    emoji:
                      "🎮"

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

                  `💰 **${
                    money(
                      session.budget
                    )
                  }**\n\n` +

                  "🧠 Uygun işlemciler hesaplanıyor...\n" +
                  "🎮 Uygun ekran kartları hesaplanıyor...\n" +
                  "🛒 ReefAPI'den canlı fiyatlar alınıyor...\n" +
                  "🔧 Uyumluluk kontrol ediliyor...\n" +
                  "💰 Bütçe kontrol ediliyor..."

                )

            ],

            components: []

          });

          const result =
            await makeBuild(
              session
            );

          if (!result) {

            const maxAllowed =
              session.budget +
              15000;

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

                    "ReefAPI'deki canlı sonuçlarda " +
                    "uygun parçalarla sistem oluşturamadım.\n\n" +

                    `💰 **Bütçe:** ${
                      money(
                        session.budget
                      )
                    }\n` +

                    `📈 **İzin verilen maksimum:** ${
                      money(
                        maxAllowed
                      )
                    }\n\n` +

                    "💡 Başka bir CPU/GPU markası veya " +
                    "biraz daha yüksek bütçe deneyebilirsin."

                  )

              ],

              components: []

            });

            return;
          }

          /* =================================================
             SONUÇ
          ================================================= */

          const difference =
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
                  session.cpu === "amd"
                    ? "AMD"
                    : "Intel"
                }\n` +

                `🎮 **GPU tercihi:** ${
                  session.gpu === "nvidia"
                    ? "NVIDIA"
                    : "AMD"
                }\n\n` +

                `💰 **Bütçe:** ${
                  money(
                    session.budget
                  )
                }\n` +

                `💵 **Toplam:** ${
                  money(
                    result.total
                  )
                }\n` +

                (
                  overBudget

                    ? `🟡 **Bütçenin ${
                        money(
                          Math.abs(
                            difference
                          )
                        )
                      } üzerinde**\n` +

                      "📈 Bu sistem izin verilen +15K sınırı içinde."

                    : `🟢 **Bütçenin ${
                        money(
                          Math.abs(
                            difference
                          )
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

                    ? `[🛒 Ürünü görüntüle](${product.url})`

                    : "🔗 Link bulunamadı"
                ),

              inline: false

            });

          }

          /* =================================================
             120K MİZAH
          ================================================= */

          if (
            session.budget >=
            120000
          ) {

            embed.addFields({

              name:
                "💀 120K+ Bölgesi",

              value:
                "Bu bütçede ekran kartı artık sistemin patronu. Maaşını da ona yatırıyoruz.",

              inline: false

            });

          }

          embed.setFooter({

            text:
              "PC Builder • ReefAPI canlı fiyat"

          });

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
         SELECT MENÜ
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
              "❌ Oturum bulunamadı. `/pctopla` ile yeniden başla.",

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
              `✅ Oyun seçildi: **${
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
              `✅ CPU tercihi: **${
                session.cpu === "amd"
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
              `✅ GPU tercihi: **${
                session.gpu === "nvidia"
                  ? "NVIDIA"
                  : "AMD"
              }**`,

            components: []

          });

          return;
        }
      }

      /* =====================================================
         BÜTÇE MODAL
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
              money(
                budget
              )
            }** olarak seçildi.\n\n` +

            `📈 Sistem gerekirse bütçenin en fazla **15.000 TL** üzerine çıkabilir.`,

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