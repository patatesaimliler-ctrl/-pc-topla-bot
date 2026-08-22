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

// ==============================
// AYARLAR
// ==============================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const REEF_KEY = process.env.REEF_KEY;

// Kullanıcı oturumları
const sessions = new Map();

// ==============================
// OYUNLAR
// ==============================

const games = {
  valorant: {
    name: "VALORANT",
    cpu: "Ryzen 5 7500F",
    gpu: "RTX 4060"
  },

  cs2: {
    name: "CS2",
    cpu: "Ryzen 5 7500F",
    gpu: "RTX 4060"
  },

  gta5: {
    name: "GTA V",
    cpu: "Ryzen 5 5600",
    gpu: "RX 7600"
  },

  rdr2: {
    name: "Red Dead Redemption 2",
    cpu: "Ryzen 5 7500F",
    gpu: "RX 7700 XT"
  },

  minecraft: {
    name: "Minecraft",
    cpu: "Ryzen 5 5600",
    gpu: "RTX 4060"
  },

  fortnite: {
    name: "Fortnite",
    cpu: "Ryzen 5 7500F",
    gpu: "RTX 4060"
  },

  fc: {
    name: "EA SPORTS FC",
    cpu: "Ryzen 5 5600",
    gpu: "RTX 4060"
  }
};

// ==============================
// PARA
// ==============================

function money(number) {
  return `${Math.round(number).toLocaleString("tr-TR")} TL`;
}

// ==============================
// REEF API
// ==============================

async function reefSearch(query, maxPrice = null) {

  if (!REEF_KEY) {
    throw new Error("REEF_KEY bulunamadı.");
  }

  const body = {
    query,
    page: 1,
    max_pages: 2,
    sort: "price"
  };

  if (maxPrice) {
    body.price = {
      max: maxPrice
    };
  }

  const response = await fetch(
    "https://api.reefapi.com/trendyol/v1/search",
    {
      method: "POST",

      headers: {
        "x-api-key": REEF_KEY,
        "content-type": "application/json"
      },

      body: JSON.stringify(body)
    }
  );

  const json = await response.json();

  if (!response.ok || json.ok === false) {
    throw new Error(
      json?.error?.message ||
      `Reef API hatası: ${response.status}`
    );
  }

  return json.data?.results || [];
}

// ==============================
// ÜRÜN BUL
// ==============================

async function findProduct(queries, maxPrice) {

  for (const query of queries) {

    try {

      const results = await reefSearch(
        query,
        maxPrice
      );

      const valid = results
        .filter(product =>
          product &&
          typeof product.price === "number" &&
          product.price > 0 &&
          product.price <= maxPrice
        )
        .sort((a, b) =>
          a.price - b.price
        );

      if (valid.length > 0) {
        return valid[0];
      }

    } catch (error) {
      console.log(
        `Ürün aranamadı (${query}):`,
        error.message
      );
    }
  }

  return null;
}

// ==============================
// PC PARÇA ARAMALARI
// ==============================

function getPartQueries(session) {

  let cpu;

  if (session.cpuBrand === "amd") {

    if (session.budget < 45000) {
      cpu = [
        "Ryzen 5 5600",
        "Ryzen 5 5500"
      ];
    }

    else if (session.budget < 80000) {
      cpu = [
        "Ryzen 5 7500F",
        "Ryzen 5 7600"
      ];
    }

    else {
      cpu = [
        "Ryzen 7 7800X3D",
        "Ryzen 7 9800X3D"
      ];
    }

  } else {

    if (session.budget < 45000) {
      cpu = [
        "Intel Core i5 12400F",
        "Intel Core i3 12100F"
      ];
    }

    else if (session.budget < 80000) {
      cpu = [
        "Intel Core i5 14400F",
        "Intel Core i5 14600KF"
      ];
    }

    else {
      cpu = [
        "Intel Core i7 14700F",
        "Intel Core Ultra 7"
      ];
    }
  }

  let gpu;

  if (session.gpuBrand === "nvidia") {

    if (session.budget < 45000) {
      gpu = [
        "RTX 4060",
        "RTX 3050"
      ];
    }

    else if (session.budget < 80000) {
      gpu = [
        "RTX 4060",
        "RTX 4060 Ti",
        "RTX 5060"
      ];
    }

    else if (session.budget < 120000) {
      gpu = [
        "RTX 5070",
        "RTX 4070 Super"
      ];
    }

    else {
      gpu = [
        "RTX 5080",
        "RTX 5090"
      ];
    }

  } else {

    if (session.budget < 45000) {
      gpu = [
        "RX 7600",
        "RX 6600"
      ];
    }

    else if (session.budget < 80000) {
      gpu = [
        "RX 7700 XT",
        "RX 7800 XT"
      ];
    }

    else {
      gpu = [
        "RX 9070 XT",
        "RX 7900 XTX"
      ];
    }
  }

  return {
    cpu,

    gpu,

    ram:
      session.budget < 50000
        ? ["16GB DDR4 RAM", "16GB RAM"]
        : ["32GB DDR5 RAM", "32GB DDR5 6000"],

    ssd:
      session.budget < 60000
        ? ["1TB NVMe SSD", "500GB NVMe SSD"]
        : ["1TB NVMe SSD", "2TB NVMe SSD"],

    motherboard:
      session.cpuBrand === "amd"
        ? ["B650 Anakart", "B550 Anakart"]
        : ["B760 Anakart", "B660 Anakart"],

    psu:
      session.budget < 60000
        ? [
            "650W 80 Plus Bronze PSU",
            "550W 80 Plus Bronze PSU"
          ]
        : [
            "750W 80 Plus Gold PSU",
            "650W 80 Plus Gold PSU"
          ],

    case: [
      "Mesh ATX Kasa",
      "Airflow ATX Kasa"
    ]
  };
}

// ==============================
// OYUN MENÜSÜ
// ==============================

function gameMenu(session) {

  return new ActionRowBuilder()
    .addComponents(

      new StringSelectMenuBuilder()
        .setCustomId("game_select")
        .setPlaceholder(
          session.game
            ? `🎮 ${games[session.game].name}`
            : "🎮 Oyun seç"
        )
        .addOptions(
          Object.entries(games).map(
            ([id, game]) => ({
              label: game.name,
              value: id,
              emoji: "🎮"
            })
          )
        )
    );
}

// ==============================
// ANA PANEL
// ==============================

function mainMenu(session) {

  const embed = new EmbedBuilder()
    .setTitle("🖥️ PC TOPLA")
    .setDescription(
      "## 🚀 PC Builder\n\n" +

      "Seçimlerini aşağıdaki panelden yap.\n" +
      "Tuşlara bastığında **mesaj gönderilmez**, " +
      "sadece seçimlerin güncellenir.\n\n" +

      `💰 **Bütçe:** ${
        session.budget
          ? money(session.budget)
          : "Henüz seçilmedi"
      }\n` +

      `🎮 **Oyun:** ${
        session.game
          ? games[session.game].name
          : "Henüz seçilmedi"
      }\n` +

      `📦 **Paket:** ${
        session.package === "full"
          ? "🎒 Wraith Full Paket"
          : "🖥️ Sadece Kasa"
      }\n` +

      `🧠 **CPU:** ${
        session.cpuBrand === "amd"
          ? "AMD"
          : "Intel"
      }\n` +

      `🎮 **GPU:** ${
        session.gpuBrand === "nvidia"
          ? "NVIDIA"
          : "AMD"
      }\n\n` +

      "━━━━━━━━━━━━━━━━━━\n" +

      "🚀 Hazır olduğunda **PC'Yİ OLUŞTUR** butonuna bas."
    )
    .setFooter({
      text: "PC Builder • Canlı Trendyol fiyatları"
    });

  const budgetRow =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("budget")
          .setLabel("💰 Bütçe")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId("package_case")
          .setLabel("🖥️ Sadece Kasa")
          .setStyle(
            session.package === "case"
              ? ButtonStyle.Success
              : ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId("package_full")
          .setLabel("🎒 Wraith Full Paket")
          .setStyle(
            session.package === "full"
              ? ButtonStyle.Success
              : ButtonStyle.Secondary
          )
      );

  const cpuRow =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("cpu_amd")
          .setLabel("🧠 AMD")
          .setStyle(
            session.cpuBrand === "amd"
              ? ButtonStyle.Primary
              : ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId("cpu_intel")
          .setLabel("🧠 Intel")
          .setStyle(
            session.cpuBrand === "intel"
              ? ButtonStyle.Primary
              : ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId("gpu_nvidia")
          .setLabel("🎮 NVIDIA")
          .setStyle(
            session.gpuBrand === "nvidia"
              ? ButtonStyle.Primary
              : ButtonStyle.Secondary
          ),

        new ButtonBuilder()
          .setCustomId("gpu_amd")
          .setLabel("🎮 AMD GPU")
          .setStyle(
            session.gpuBrand === "amd"
              ? ButtonStyle.Primary
              : ButtonStyle.Secondary
          )
      );

  const buildRow =
    new ActionRowBuilder()
      .addComponents(

        new ButtonBuilder()
          .setCustomId("build")
          .setLabel("🚀 PC'Yİ OLUŞTUR")
          .setStyle(ButtonStyle.Success)
      );

  return {
    embeds: [embed],

    components: [
      budgetRow,
      gameMenu(session),
      cpuRow,
      buildRow
    ]
  };
}

// ==============================
// BÜTÇE MODAL
// ==============================

function budgetModal() {

  const modal =
    new ModalBuilder()
      .setCustomId("budget_modal")
      .setTitle("💰 PC Bütçesi");

  const input =
    new TextInputBuilder()
      .setCustomId("budget_input")
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

// ==============================
// SLASH KOMUT
// ==============================

const commands = [

  new SlashCommandBuilder()
    .setName("pctopla")
    .setDescription(
      "Butonlarla kendi PC sistemini oluştur."
    )

].map(command =>
  command.toJSON()
);

const rest =
  new REST({
    version: "10"
  }).setToken(DISCORD_TOKEN);

// ==============================
// BOT READY
// ==============================

client.once("ready", async () => {

  console.log(
    `✅ Bot aktif: ${client.user.tag}`
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
      "✅ /pctopla komutu kaydedildi."
    );

  } catch (error) {

    console.error(
      "❌ Komut kayıt hatası:",
      error
    );
  }
});

// ==============================
// ETKİLEŞİMLER
// ==============================

client.on(
  "interactionCreate",
  async interaction => {

    // ==========================
    // /pctopla
    // ==========================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "pctopla"
    ) {

      const session = {

        budget: null,

        game: null,

        package: "case",

        cpuBrand: "amd",

        gpuBrand: "nvidia"
      };

      sessions.set(
        interaction.user.id,
        session
      );

      await interaction.reply({
        ...mainMenu(session),
        ephemeral: true
      });

      return;
    }

    // ==========================
    // OTURUM
    // ==========================

    const session =
      sessions.get(
        interaction.user.id
      );

    if (!session) {

      if (
        interaction.isButton() ||
        interaction.isStringSelectMenu() ||
        interaction.isModalSubmit()
      ) {

        await interaction.reply({
          content:
            "❌ Oturumun süresi dolmuş. `/pctopla` ile yeniden başla.",
          ephemeral: true
        });
      }

      return;
    }

    // ==========================
    // BÜTÇE BUTONU
    // ==========================

    if (
      interaction.isButton() &&
      interaction.customId === "budget"
    ) {

      await interaction.showModal(
        budgetModal()
      );

      return;
    }

    // ==========================
    // BÜTÇE MODAL
    // ==========================

    if (
      interaction.isModalSubmit() &&
      interaction.customId === "budget_modal"
    ) {

      const raw =
        interaction.fields.getTextInputValue(
          "budget_input"
        );

      const budget =
        Number(
          raw
            .replace(/\./g, "")
            .replace(",", ".")
            .replace(/[^\d.]/g, "")
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

      await interaction.update(
        mainMenu(session)
      );

      return;
    }

    // ==========================
    // PAKET
    // ==========================

    if (
      interaction.isButton() &&
      interaction.customId === "package_case"
    ) {

      session.package = "case";

      await interaction.update(
        mainMenu(session)
      );

      return;
    }

    if (
      interaction.isButton() &&
      interaction.customId === "package_full"
    ) {

      session.package = "full";

      await interaction.update(
        mainMenu(session)
      );

      return;
    }

    // ==========================
    // CPU
    // ==========================

    if (
      interaction.isButton() &&
      interaction.customId === "cpu_amd"
    ) {

      session.cpuBrand = "amd";

      await interaction.update(
        mainMenu(session)
      );

      return;
    }

    if (
      interaction.isButton() &&
      interaction.customId === "cpu_intel"
    ) {

      session.cpuBrand = "intel";

      await interaction.update(
        mainMenu(session)
      );

      return;
    }

    // ==========================
    // GPU
    // ==========================

    if (
      interaction.isButton() &&
      interaction.customId === "gpu_nvidia"
    ) {

      session.gpuBrand = "nvidia";

      await interaction.update(
        mainMenu(session)
      );

      return;
    }

    if (
      interaction.isButton() &&
      interaction.customId === "gpu_amd"
    ) {

      session.gpuBrand = "amd";

      await interaction.update(
        mainMenu(session)
      );

      return;
    }

    // ==========================
    // OYUN
    // ==========================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "game_select"
    ) {

      session.game =
        interaction.values[0];

      await interaction.update(
        mainMenu(session)
      );

      return;
    }

    // ==========================
    // PC OLUŞTUR
    // ==========================

    if (
      interaction.isButton() &&
      interaction.customId === "build"
    ) {

      if (!session.budget) {

        await interaction.reply({
          content:
            "💰 Önce bütçeni gir knk.",
          ephemeral: true
        });

        return;
      }

      if (!session.game) {

        await interaction.reply({
          content:
            "🎮 Önce oynayacağın oyunu seç.",
          ephemeral: true
        });

        return;
      }

      await interaction.update({

        embeds: [
          new EmbedBuilder()
            .setTitle("🔎 PC Builder çalışıyor...")
            .setDescription(
              "Canlı fiyatlar aranıyor.\n\n" +
              "🧠 İşlemci\n" +
              "🎮 Ekran kartı\n" +
              "🧩 RAM\n" +
              "💾 SSD\n" +
              "🔧 Anakart\n" +
              "⚡ PSU\n" +
              "📦 Kasa\n\n" +
              "Biraz fiyat avlıyorum... 🕵️"
            )
        ],

        components: []
      });

      try {

        const queries =
          getPartQueries(session);

        /*
         * Bütçeyi aşmamak için parçaların
         * toplamına göre limitleri hesaplıyoruz.
         */

        const budget =
          session.budget;

        const cpuBudget =
          Math.floor(
            budget * 0.20
          );

        const gpuBudget =
          Math.floor(
            budget * 0.40
          );

        const ramBudget =
          Math.floor(
            budget * 0.08
          );

        const ssdBudget =
          Math.floor(
            budget * 0.08
          );

        const motherboardBudget =
          Math.floor(
            budget * 0.12
          );

        const psuBudget =
          Math.floor(
            budget * 0.07
          );

        const caseBudget =
          Math.floor(
            budget * 0.10
          );

        const results =
          await Promise.all([

            findProduct(
              queries.cpu,
              cpuBudget
            ),

            findProduct(
              queries.gpu,
              gpuBudget
            ),

            findProduct(
              queries.ram,
              ramBudget
            ),

            findProduct(
              queries.ssd,
              ssdBudget
            ),

            findProduct(
              queries.motherboard,
              motherboardBudget
            ),

            findProduct(
              queries.psu,
              psuBudget
            ),

            findProduct(
              queries.case,
              caseBudget
            )
          ]);

        const [
          cpu,
          gpu,
          ram,
          ssd,
          motherboard,
          psu,
          pcCase
        ] = results;

        const parts = [
          {
            name: "🧠 İşlemci",
            product: cpu
          },
          {
            name: "🎮 Ekran Kartı",
            product: gpu
          },
          {
            name: "🧩 RAM",
            product: ram
          },
          {
            name: "💾 SSD",
            product: ssd
          },
          {
            name: "🔧 Anakart",
            product: motherboard
          },
          {
            name: "⚡ PSU",
            product: psu
          },
          {
            name: "📦 Kasa",
            product: pcCase
          }
        ];

        // ======================
        // BULUNAMAYAN PARÇA
        // ======================

        if (
          parts.some(
            part => !part.product
          )
        ) {

          await interaction.editReply({

            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "❌ Sistem oluşturulamadı"
                )
                .setDescription(
                  "Bazı parçaların fiyatını canlı olarak bulamadım.\n\n" +
                  "Bütçeni artırmayı değil, başka ürün kombinasyonu denemeyi tercih ederim. 😎"
                )
            ],

            components: []
          });

          return;
        }

        // ======================
        // TOPLAM
        // ======================

        let total = 0;

        for (const part of parts) {

          total +=
            Number(
              part.product.price
            );
        }

        // ======================
        // BÜTÇE GARANTİSİ
        // ======================

        if (total > budget) {

          await interaction.editReply({

            embeds: [
              new EmbedBuilder()
                .setTitle(
                  "💸 Bütçe duvarına çarptık"
                )
                .setDescription(
                  `Toplam: **${money(total)}**\n` +
                  `Bütçe: **${money(budget)}**\n\n` +
                  "Bu sistem bütçeyi geçtiği için bunu önermiyorum. " +
                  "PC Builder'ın bütçe departmanı veto bastı. 🗿"
                )
            ],

            components: []
          });

          return;
        }

        // ======================
        // SONUÇ
        // ======================

        const embed =
          new EmbedBuilder()
            .setTitle(
              "🚀 PC BUILDER SONUCU"
            )
            .setDescription(

              `🎮 **Oyun:** ${games[session.game].name}\n` +

              `💰 **Bütçe:** ${money(budget)}\n` +

              `📦 **Paket:** ${
                session.package === "full"
                  ? "🎒 Wraith Full Paket"
                  : "🖥️ Sadece Kasa"
              }\n\n` +

              `💵 **Toplam:** ${money(total)}\n` +

              `🟢 **Bütçede kalan:** ${money(
                budget - total
              )}\n\n` +

              "━━━━━━━━━━━━━━━━━━"
            )
            .setFooter({
              text:
                total > 120000
                  ? "💀 120K+ bölgesine giriş yaptın. Cüzdan başarıyla korktu."
                  : "PC Builder • Canlı Trendyol fiyatları"
            });

        for (
          const part of parts
        ) {

          const product =
            part.product;

          embed.addFields({

            name: part.name,

            value:

              `**${product.title}**\n` +

              `💰 **${money(
                product.price
              )}**\n` +

              `🏪 ${product.brand || "Marka belirtilmemiş"}\n` +

              `[🛒 Ürüne git](${product.url})`,

            inline: false
          });
        }

        if (
          session.budget > 120000
        ) {

          embed.addFields({

            name:
              "💀 120K+ Uyarısı",

            value:
              "Bu bütçede artık PC toplamıyorsun, " +
              "anakarta küçük bir villa yaptırıyorsun. 😭",

            inline: false
          });
        }

        await interaction.editReply({

          embeds: [embed],

          components: []
        });

      } catch (error) {

        console.error(
          "PC OLUŞTURMA HATASI:",
          error
        );

        await interaction.editReply({

          embeds: [
            new EmbedBuilder()
              .setTitle(
                "❌ Fiyat sistemi hata verdi"
              )
              .setDescription(
                "ReefAPI'den canlı fiyatları alırken bir sorun çıktı.\n\n" +
                `\`${error.message}\``
              )
          ],

          components: []
        });
      }

      return;
    }
  }
);

// ==============================
// BOTU BAŞLAT
// ==============================

client.login(
  DISCORD_TOKEN
);