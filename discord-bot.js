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

const TOKEN = process.env.DISCORD_TOKEN;
const REEF_KEY = process.env.REEF_KEY;

if (!TOKEN) throw new Error("DISCORD_TOKEN eksik!");
if (!REEF_KEY) throw new Error("REEF_KEY eksik!");

const sessions = new Map();

function money(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

/* =====================================================
   REEFAPI
===================================================== */

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
        query: query,
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
      `ReefAPI JSON döndürmedi: ${text.slice(0, 300)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `ReefAPI ${response.status}: ${
        data?.error?.message ||
        data?.message ||
        text
      }`
    );
  }

  /*
    ReefAPI response yapısı değişirse burada
    mümkün olan sonuç alanlarını kontrol ediyoruz.
  */

  const results =
    data?.data?.results ||
    data?.data?.products ||
    data?.results ||
    data?.products ||
    [];

  if (!Array.isArray(results)) {
    return [];
  }

  return results;
}

/* =====================================================
   ÜRÜN FİYATI AYIKLA
===================================================== */

function getPrice(product) {

  const possiblePrices = [
    product.price,
    product.salePrice,
    product.currentPrice,
    product.discountedPrice,
    product.minPrice
  ];

  for (const price of possiblePrices) {

    if (typeof price === "number" && price > 0) {
      return price;
    }

    if (typeof price === "string") {

      const number =
        Number(
          price
            .replace(/[^\d,.-]/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
        );

      if (Number.isFinite(number) && number > 0) {
        return number;
      }
    }
  }

  return null;
}

/* =====================================================
   ÜRÜN ADI
===================================================== */

function getTitle(product) {

  return (
    product.title ||
    product.name ||
    product.productName ||
    "Ürün"
  );
}

/* =====================================================
   ÜRÜN URL
===================================================== */

function getUrl(product) {

  return (
    product.url ||
    product.productUrl ||
    product.link ||
    null
  );
}

/* =====================================================
   EN UCUZ ÜRÜNÜ BUL
===================================================== */

async function findProduct(queries, maxPrice) {

  for (const query of queries) {

    try {

      console.log(
        `🔎 ReefAPI aranıyor: ${query}`
      );

      const results =
        await reefSearch(query);

      const products =
        results
          .map(product => ({
            raw: product,
            price: getPrice(product),
            title: getTitle(product),
            url: getUrl(product)
          }))
          .filter(product =>
            product.price &&
            product.price <= maxPrice
          )
          .sort(
            (a, b) =>
              a.price - b.price
          );

      if (products.length > 0) {

        console.log(
          `✅ Bulundu: ${products[0].title} - ${products[0].price} TL`
        );

        return products[0];
      }

    } catch (error) {

      console.error(
        `❌ ${query}:`,
        error.message
      );
    }
  }

  return null;
}

/* =====================================================
   OYUNLAR
===================================================== */

const games = {
  valorant: "VALORANT",
  minecraft: "Minecraft",
  fortnite: "Fortnite",
  gta: "GTA V",
  rdr2: "Red Dead Redemption 2",
  fc: "EA SPORTS FC"
};

/* =====================================================
   PARÇA SORGULARI
===================================================== */

function getQueries(session) {

  let cpu;
  let gpu;

  if (session.cpu === "amd") {

    cpu =
      session.budget < 45000
        ? [
            "Ryzen 5 5500",
            "Ryzen 5 5600"
          ]
        : session.budget < 80000
          ? [
              "Ryzen 5 7500F",
              "Ryzen 5 7600"
            ]
          : [
              "Ryzen 7 7800X3D",
              "Ryzen 7 9800X3D"
            ];

  } else {

    cpu =
      session.budget < 45000
        ? [
            "Intel Core i3 12100F",
            "Intel Core i5 12400F"
          ]
        : session.budget < 80000
          ? [
              "Intel Core i5 14400F",
              "Intel Core i5 14600KF"
            ]
          : [
              "Intel Core i7 14700F",
              "Intel Core Ultra 7"
            ];
  }

  if (session.gpu === "nvidia") {

    gpu =
      session.budget < 45000
        ? [
            "RTX 3050",
            "RTX 4060"
          ]
        : session.budget < 80000
          ? [
              "RTX 4060",
              "RTX 4060 Ti",
              "RTX 5060"
            ]
        : session.budget < 120000
          ? [
              "RTX 5070",
              "RTX 4070 Super"
            ]
        : [
            "RTX 5080",
            "RTX 5090"
          ];

  } else {

    gpu =
      session.budget < 45000
        ? [
            "RX 6600",
            "RX 7600"
          ]
        : session.budget < 80000
          ? [
              "RX 7600 XT",
              "RX 7700 XT"
            ]
        : [
            "RX 7800 XT",
            "RX 9070 XT"
          ];
  }

  return {

    cpu,

    gpu,

    ram:
      session.budget < 50000
        ? [
            "16GB DDR4 RAM",
            "16GB RAM"
          ]
        : [
            "32GB DDR5 RAM",
            "32GB DDR5 6000"
          ],

    ssd:
      session.budget < 60000
        ? [
            "500GB NVMe SSD",
            "1TB NVMe SSD"
          ]
        : [
            "1TB NVMe SSD",
            "2TB NVMe SSD"
          ],

    motherboard:
      session.cpu === "amd"
        ? [
            "B550 anakart",
            "B650 anakart"
          ]
        : [
            "B660 anakart",
            "B760 anakart"
          ],

    psu:
      session.budget < 60000
        ? [
            "550W 80 Plus Bronze PSU",
            "650W 80 Plus Bronze PSU"
          ]
        : [
            "650W 80 Plus Gold PSU",
            "750W 80 Plus Gold PSU"
          ],

    case: [
      "Mesh ATX kasa",
      "Airflow ATX kasa"
    ]
  };
}

/* =====================================================
   ANA PANEL
===================================================== */

function panel(session) {

  const embed =
    new EmbedBuilder()
      .setTitle("🖥️ PC TOPLA")
      .setDescription(
        "## 🚀 PC Builder\n\n" +

        `💰 **Bütçe:** ${
          session.budget
            ? money(session.budget)
            : "Henüz seçilmedi"
        }\n` +

        `🎮 **Oyun:** ${
          session.game
            ? games[session.game]
            : "Henüz seçilmedi"
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

        "📦 **Paket:** 🖥️ Sadece Kasa\n\n" +

        "Tuşlar sadece seçimi değiştirir.\n" +
        "🚀 **PC'Yİ OLUŞTUR** basılmadan fiyat araması yapılmaz."
      )
      .setFooter({
        text:
          "PC Builder • ReefAPI canlı fiyat"
      });

  const row1 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("budget")
          .setLabel(
            session.budget
              ? `💰 ${money(session.budget)}`
              : "💰 Bütçe"
          )
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("cpu")
          .setLabel(
            session.cpu === "amd"
              ? "🧠 AMD"
              : "🧠 Intel"
          )
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId("gpu")
          .setLabel(
            session.gpu === "nvidia"
              ? "🎮 NVIDIA"
              : "🎮 AMD"
          )
          .setStyle(ButtonStyle.Secondary)
      );

  const row2 =
    new ActionRowBuilder()
      .addComponents(

        new StringSelectMenuBuilder()
          .setCustomId("game")
          .setPlaceholder(
            session.game
              ? `🎮 ${games[session.game]}`
              : "🎮 Oyun seç"
          )
          .addOptions(
            Object.entries(games).map(
              ([value, name]) => ({
                label: name,
                value,
                emoji: "🎮"
              })
            )
          )
      );

  const row3 =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("create")
          .setLabel("🚀 PC'Yİ OLUŞTUR")
          .setStyle(ButtonStyle.Success)
      );

  return {
    embeds: [embed],
    components: [
      row1,
      row2,
      row3
    ]
  };
}

/* =====================================================
   BÜTÇE MODAL
===================================================== */

function budgetModal() {

  const modal =
    new ModalBuilder()
      .setCustomId("budget_modal")
      .setTitle("💰 Bütçe");

  const input =
    new TextInputBuilder()
      .setCustomId("budget")
      .setLabel("Bütçeni TL olarak yaz")
      .setPlaceholder("Örn: 75000")
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(4)
      .setMaxLength(7);

  modal.addComponents(
    new ActionRowBuilder()
      .addComponents(input)
  );

  return modal;
}

/* =====================================================
   PC OLUŞTUR
===================================================== */

async function buildPC(session) {

  const q =
    getQueries(session);

  const budget =
    session.budget;

  /*
   * Bütçeyi yaklaşık dağıtıyoruz.
   * En son toplamı yine kesin kontrol ediyoruz.
   */

  const cpuLimit =
    Math.floor(budget * 0.20);

  const gpuLimit =
    Math.floor(budget * 0.40);

  const ramLimit =
    Math.floor(budget * 0.08);

  const ssdLimit =
    Math.floor(budget * 0.07);

  const motherboardLimit =
    Math.floor(budget * 0.10);

  const psuLimit =
    Math.floor(budget * 0.07);

  const caseLimit =
    Math.floor(budget * 0.08);

  console.log("🔎 Canlı fiyat araması başladı.");

  const [
    cpu,
    gpu,
    ram,
    ssd,
    motherboard,
    psu,
    pcCase
  ] =
    await Promise.all([

      findProduct(
        q.cpu,
        cpuLimit
      ),

      findProduct(
        q.gpu,
        gpuLimit
      ),

      findProduct(
        q.ram,
        ramLimit
      ),

      findProduct(
        q.ssd,
        ssdLimit
      ),

      findProduct(
        q.motherboard,
        motherboardLimit
      ),

      findProduct(
        q.psu,
        psuLimit
      ),

      findProduct(
        q.case,
        caseLimit
      )
    ]);

  const parts = [
    ["🧠 İşlemci", cpu],
    ["🎮 Ekran Kartı", gpu],
    ["🧩 RAM", ram],
    ["💾 SSD", ssd],
    ["🔧 Anakart", motherboard],
    ["⚡ PSU", psu],
    ["📦 Kasa", pcCase]
  ];

  const missing =
    parts.filter(
      ([, product]) => !product
    );

  if (missing.length) {

    return {
      ok: false,
      reason:
        "Bütçene uygun canlı fiyatlı tüm parçaları bulamadım."
    };
  }

  const total =
    parts.reduce(
      (sum, [, product]) =>
        sum + product.price,
      0
    );

  /*
   * BÜTÇE KİLİDİ
   */

  if (total > budget) {

    return {
      ok: false,
      reason:
        `Bulunan parçalar ${money(total)} tuttu. ` +
        `Bütçe ${money(budget)} olduğu için sistemi göndermedim.`
    };
  }

  return {
    ok: true,
    parts,
    total
  };
}

/* =====================================================
   SLASH KOMUT
===================================================== */

const commands = [
  new SlashCommandBuilder()
    .setName("pctopla")
    .setDescription(
      "Canlı ReefAPI fiyatlarıyla PC oluştur."
    )
].map(x => x.toJSON());

/* =====================================================
   READY
===================================================== */

client.once("ready", async () => {

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
      "✅ /pctopla hazır!"
    );

  } catch (error) {

    console.error(
      "❌ Komut kayıt hatası:",
      error
    );
  }
});

/* =====================================================
   INTERACTIONS
===================================================== */

client.on(
  "interactionCreate",
  async interaction => {

    try {

      /* ================================
         /pctopla
      ================================= */

      if (
        interaction.isChatInputCommand() &&
        interaction.commandName === "pctopla"
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

      /* ================================
         BUTON
      ================================= */

      if (interaction.isButton()) {

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

        /* BÜTÇE */

        if (
          interaction.customId ===
          "budget"
        ) {

          await interaction.showModal(
            budgetModal()
          );

          return;
        }

        /* CPU */

        if (
          interaction.customId ===
          "cpu"
        ) {

          session.cpu =
            session.cpu === "amd"
              ? "intel"
              : "amd";

          await interaction.update(
            panel(session)
          );

          return;
        }

        /* GPU */

        if (
          interaction.customId ===
          "gpu"
        ) {

          session.gpu =
            session.gpu === "nvidia"
              ? "amd"
              : "nvidia";

          await interaction.update(
            panel(session)
          );

          return;
        }

        /* OLUŞTUR */

        if (
          interaction.customId ===
          "create"
        ) {

          if (!session.budget) {

            await interaction.reply({
              content:
                "💰 Önce bütçeni gir.",
              ephemeral: true
            });

            return;
          }

          if (!session.game) {

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
                .setTitle(
                  "🔎 CANLI FİYATLAR ARANIYOR"
                )
                .setDescription(
                  "🛒 ReefAPI üzerinden güncel ürün fiyatları aranıyor...\n\n" +
                  `💰 Bütçe: **${money(session.budget)}**\n` +
                  `🎮 Oyun: **${games[session.game]}**\n\n` +
                  "⏳ Biraz bekle..."
                )
            ],

            components: []
          });

          const result =
            await buildPC(session);

          if (!result.ok) {

            await interaction.editReply({

              embeds: [
                new EmbedBuilder()
                  .setTitle(
                    "❌ PC OLUŞTURULAMADI"
                  )
                  .setDescription(
                    result.reason
                  )
                  .setFooter({
                    text:
                      "PC Builder • ReefAPI"
                  })
              ],

              components:
                panel(session).components
            });

            return;
          }

          const embed =
            new EmbedBuilder()
              .setTitle(
                "🚀 PC HAZIR!"
              )
              .setDescription(
                `🎮 **Oyun:** ${
                  games[session.game]
                }\n` +

                `💰 **Bütçe:** ${
                  money(session.budget)
                }\n` +

                `💵 **Toplam:** ${
                  money(result.total)
                }\n` +

                `🟢 **Kalan:** ${
                  money(
                    session.budget -
                    result.total
                  )
                }\n\n` +

                "✅ **Bütçe aşılmadı.**"
              )
              .setFooter({
                text:
                  "PC Builder • ReefAPI canlı fiyat"
              });

          for (
            const [name, product]
            of result.parts
          ) {

            embed.addFields({

              name,

              value:
                `**${product.title}**\n` +
                `💰 **${money(product.price)}**\n` +
                (
                  product.url
                    ? `[🛒 Ürüne git](${product.url})`
                    : "🔗 Ürün linki bulunamadı"
                ),

              inline: false
            });
          }

          if (
            session.budget >
            120000
          ) {

            embed.addFields({

              name:
                "💀 120K+ Bölgesi",

              value:
                "Bu bütçede artık ekran kartı sana sistem toplamaya başlıyor. 😭",

              inline: false
            });
          }

          await interaction.editReply({

            embeds: [embed],

            components: []
          });

          return;
        }
      }

      /* ================================
         OYUN
      ================================= */

      if (
        interaction.isStringSelectMenu() &&
        interaction.customId === "game"
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

        session.game =
          interaction.values[0];

        await interaction.update(
          panel(session)
        );

        return;
      }

      /* ================================
         BÜTÇE MODAL
      ================================= */

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
              "❌ Oturum bulunamadı.",
            ephemeral: true
          });

          return;
        }

        const raw =
          interaction.fields
            .getTextInputValue(
              "budget"
            );

        const budget =
          Number(
            raw
              .replace(/\./g, "")
              .replace(/[^\d]/g, "")
          );

        if (
          !Number.isFinite(budget) ||
          budget < 10000 ||
          budget > 500000
        ) {

          await interaction.reply({
            content:
              "❌ Bütçe 10.000 TL ile 500.000 TL arasında olmalı.",
            ephemeral: true
          });

          return;
        }

        session.budget =
          Math.floor(budget);

        /*
         * Modal gönderildikten sonra
         * paneli güncelle.
         */

        await interaction.reply({
          content:
            `✅ Bütçe **${money(budget)}** olarak ayarlandı.`,
          ephemeral: true
        });

        return;
      }

    } catch (error) {

      console.error(
        "❌ INTERACTION ERROR:",
        error
      );

      if (
        !interaction.replied &&
        !interaction.deferred
      ) {

        await interaction.reply({
          content:
            "❌ Bir hata oluştu. Railway Logs'u kontrol et.",
          ephemeral: true
        });
      }
    }
  }
);

/* =====================================================
   LOGIN
===================================================== */

client.login(TOKEN);