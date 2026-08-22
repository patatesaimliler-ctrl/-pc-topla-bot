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

// =====================================================
// AYARLAR
// =====================================================

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const REEF_KEY = process.env.REEF_KEY;

// =====================================================
// OYUNLAR
// =====================================================

const games = {
  valorant: "VALORANT",
  cs2: "Counter-Strike 2",
  gta5: "GTA V",
  rdr2: "Red Dead Redemption 2",
  minecraft: "Minecraft",
  fortnite: "Fortnite",
  fc: "EA SPORTS FC"
};

// =====================================================
// PARA
// =====================================================

function money(value) {
  return `${Math.round(value).toLocaleString("tr-TR")} TL`;
}

// =====================================================
// STATE
// =====================================================
//
// ARTIK Map YOK.
// Bütün seçimler butonların customId'sinde taşınıyor.
//

function encodeState(state) {
  return [
    state.budget || 0,
    state.game || "none",
    state.package || "case",
    state.cpu || "amd",
    state.gpu || "nvidia"
  ].join(".");
}

function decodeState(value) {
  const parts = value.split(".");

  return {
    budget: Number(parts[0]) || 0,
    game: parts[1] === "none" ? null : parts[1],
    package: parts[2] || "case",
    cpu: parts[3] || "amd",
    gpu: parts[4] || "nvidia"
  };
}

// =====================================================
// REEF API
// =====================================================

async function reefSearch(query) {
  if (!REEF_KEY) {
    throw new Error("REEF_KEY bulunamadı.");
  }

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
        max_pages: 2,
        sort: "price"
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      `Reef API ${response.status}`
    );
  }

  return data?.data?.results || [];
}

// =====================================================
// ÜRÜN BUL
// =====================================================

async function findProduct(queries, limit) {
  for (const query of queries) {
    try {
      const results = await reefSearch(query);

      const products = results
        .filter(product =>
          product &&
          typeof product.price === "number" &&
          product.price > 0 &&
          product.price <= limit
        )
        .sort((a, b) => a.price - b.price);

      if (products.length) {
        return products[0];
      }

    } catch (error) {
      console.log(
        `Arama hatası (${query}):`,
        error.message
      );
    }
  }

  return null;
}

// =====================================================
// PARÇA SORGULARI
// =====================================================

function getQueries(state) {
  let cpuQueries;
  let gpuQueries;

  // ---------------- CPU ----------------

  if (state.cpu === "amd") {
    if (state.budget < 45000) {
      cpuQueries = [
        "Ryzen 5 5600",
        "Ryzen 5 5500"
      ];
    } else if (state.budget < 80000) {
      cpuQueries = [
        "Ryzen 5 7500F",
        "Ryzen 5 7600"
      ];
    } else {
      cpuQueries = [
        "Ryzen 7 7800X3D",
        "Ryzen 7 9800X3D"
      ];
    }
  } else {
    if (state.budget < 45000) {
      cpuQueries = [
        "Intel Core i5 12400F",
        "Intel Core i3 12100F"
      ];
    } else if (state.budget < 80000) {
      cpuQueries = [
        "Intel Core i5 14400F",
        "Intel Core i5 14600KF"
      ];
    } else {
      cpuQueries = [
        "Intel Core i7 14700F",
        "Intel Core Ultra 7"
      ];
    }
  }

  // ---------------- GPU ----------------

  if (state.gpu === "nvidia") {
    if (state.budget < 45000) {
      gpuQueries = [
        "RTX 4060",
        "RTX 3050"
      ];
    } else if (state.budget < 80000) {
      gpuQueries = [
        "RTX 4060",
        "RTX 4060 Ti",
        "RTX 5060"
      ];
    } else if (state.budget < 120000) {
      gpuQueries = [
        "RTX 5070",
        "RTX 4070 Super"
      ];
    } else {
      gpuQueries = [
        "RTX 5080",
        "RTX 5090"
      ];
    }
  } else {
    if (state.budget < 45000) {
      gpuQueries = [
        "RX 7600",
        "RX 6600"
      ];
    } else if (state.budget < 80000) {
      gpuQueries = [
        "RX 7700 XT",
        "RX 7800 XT"
      ];
    } else {
      gpuQueries = [
        "RX 9070 XT",
        "RX 7900 XTX"
      ];
    }
  }

  return {
    cpu: cpuQueries,

    gpu: gpuQueries,

    ram:
      state.budget < 50000
        ? [
            "16GB DDR4 RAM",
            "16GB RAM"
          ]
        : [
            "32GB DDR5 RAM",
            "32GB DDR5 6000"
          ],

    ssd:
      state.budget < 60000
        ? [
            "1TB NVMe SSD",
            "500GB NVMe SSD"
          ]
        : [
            "1TB NVMe SSD",
            "2TB NVMe SSD"
          ],

    motherboard:
      state.cpu === "amd"
        ? [
            "B650 Anakart",
            "B550 Anakart"
          ]
        : [
            "B760 Anakart",
            "B660 Anakart"
          ],

    psu:
      state.budget < 60000
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

// =====================================================
// ANA PANEL
// =====================================================

function createPanel(state) {
  const stateId = encodeState(state);

  const embed = new EmbedBuilder()
    .setTitle("🖥️ PC TOPLA")
    .setDescription(
      "## 🚀 PC Builder\n\n" +
      "Seçimlerini aşağıdaki panelden yap.\n" +
      "Tuşlara bastığında **yeni mesaj gönderilmez.**\n" +
      "Seçimlerin sadece bu panelde güncellenir.\n\n" +

      `💰 **Bütçe:** ${
        state.budget
          ? money(state.budget)
          : "Henüz seçilmedi"
      }\n` +

      `🎮 **Oyun:** ${
        state.game
          ? games[state.game]
          : "Henüz seçilmedi"
      }\n` +

      `📦 **Paket:** ${
        state.package === "full"
          ? "🎒 Wraith Full Paket"
          : "🖥️ Sadece Kasa"
      }\n` +

      `🧠 **CPU:** ${
        state.cpu === "amd"
          ? "AMD"
          : "Intel"
      }\n` +

      `🎮 **GPU:** ${
        state.gpu === "nvidia"
          ? "NVIDIA"
          : "AMD"
      }\n\n` +

      "━━━━━━━━━━━━━━━━━━\n" +

      "🚀 Her şeyi seçtikten sonra **PC'Yİ OLUŞTUR** butonuna bas."
    )
    .setFooter({
      text: "PC Builder • Canlı fiyat sistemi"
    });

  // =================================================
  // BÜTÇE + PAKET
  // =================================================

  const row1 = new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId(`budget|${stateId}`)
        .setLabel("💰 Bütçe")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`case|${stateId}`)
        .setLabel("🖥️ Sadece Kasa")
        .setStyle(
          state.package === "case"
            ? ButtonStyle.Success
            : ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId(`full|${stateId}`)
        .setLabel("🎒 Wraith Full Paket")
        .setStyle(
          state.package === "full"
            ? ButtonStyle.Success
            : ButtonStyle.Secondary
        )
    );

  // =================================================
  // OYUN
  // =================================================

  const gameRow = new ActionRowBuilder()
    .addComponents(

      new StringSelectMenuBuilder()
        .setCustomId(`game|${stateId}`)
        .setPlaceholder(
          state.game
            ? `🎮 ${games[state.game]}`
            : "🎮 Oyun seç"
        )
        .addOptions(
          Object.entries(games).map(
            ([id, name]) => ({
              label: name,
              value: id,
              emoji: "🎮"
            })
          )
        )
    );

  // =================================================
  // CPU
  // =================================================

  const cpuRow = new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId(`cpuamd|${stateId}`)
        .setLabel("🧠 AMD")
        .setStyle(
          state.cpu === "amd"
            ? ButtonStyle.Primary
            : ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId(`cpuintel|${stateId}`)
        .setLabel("🧠 Intel")
        .setStyle(
          state.cpu === "intel"
            ? ButtonStyle.Primary
            : ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId(`gpunvidia|${stateId}`)
        .setLabel("🎮 NVIDIA")
        .setStyle(
          state.gpu === "nvidia"
            ? ButtonStyle.Primary
            : ButtonStyle.Secondary
        ),

      new ButtonBuilder()
        .setCustomId(`gpuamd|${stateId}`)
        .setLabel("🎮 AMD GPU")
        .setStyle(
          state.gpu === "amd"
            ? ButtonStyle.Primary
            : ButtonStyle.Secondary
        )
    );

  // =================================================
  // OLUŞTUR
  // =================================================

  const buildRow = new ActionRowBuilder()
    .addComponents(

      new ButtonBuilder()
        .setCustomId(`build|${stateId}`)
        .setLabel("🚀 PC'Yİ OLUŞTUR")
        .setStyle(ButtonStyle.Success)
    );

  return {
    embeds: [embed],
    components: [
      row1,
      gameRow,
      cpuRow,
      buildRow
    ]
  };
}

// =====================================================
// BÜTÇE MODAL
// =====================================================

function createBudgetModal(stateId) {
  const modal = new ModalBuilder()
    .setCustomId(`budgetmodal|${stateId}`)
    .setTitle("💰 Bütçe Gir");

  const input = new TextInputBuilder()
    .setCustomId("budget")
    .setLabel("Bütçen kaç TL?")
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

// =====================================================
// SLASH KOMUT
// =====================================================

const commands = [
  new SlashCommandBuilder()
    .setName("pctopla")
    .setDescription(
      "Butonlarla PC sistemi oluştur."
    )
].map(command => command.toJSON());

const rest = new REST({
  version: "10"
}).setToken(DISCORD_TOKEN);

// =====================================================
// READY
// =====================================================

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
      "✅ /pctopla hazır."
    );

  } catch (error) {
    console.error(
      "❌ Slash komut hatası:",
      error
    );
  }
});

// =====================================================
// INTERACTIONS
// =====================================================

client.on(
  "interactionCreate",
  async interaction => {

    // =================================================
    // /pctopla
    // =================================================

    if (
      interaction.isChatInputCommand() &&
      interaction.commandName === "pctopla"
    ) {

      const state = {
        budget: 0,
        game: null,
        package: "case",
        cpu: "amd",
        gpu: "nvidia"
      };

      await interaction.reply({
        ...createPanel(state),
        ephemeral: true
      });

      return;
    }

    // =================================================
    // BÜTÇE
    // =================================================

    if (
      interaction.isButton() &&
      interaction.customId.startsWith("budget|")
    ) {

      const stateId =
        interaction.customId.split("|")[1];

      await interaction.showModal(
        createBudgetModal(stateId)
      );

      return;
    }

    // =================================================
    // BÜTÇE MODAL
    // =================================================

    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("budgetmodal|")
    ) {

      const stateId =
        interaction.customId.split("|")[1];

      const state =
        decodeState(stateId);

      const raw =
        interaction.fields.getTextInputValue(
          "budget"
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

      state.budget =
        Math.floor(budget);

      await interaction.update(
        createPanel(state)
      );

      return;
    }

    // =================================================
    // DİĞER BUTONLAR
    // =================================================

    if (
      interaction.isButton()
    ) {

      const [action, stateId] =
        interaction.customId.split("|");

      if (!stateId) return;

      const state =
        decodeState(stateId);

      // -------------------------------
      // KASA
      // -------------------------------

      if (action === "case") {
        state.package = "case";

        await interaction.update(
          createPanel(state)
        );

        return;
      }

      // -------------------------------
      // FULL
      // -------------------------------

      if (action === "full") {
        state.package = "full";

        await interaction.update(
          createPanel(state)
        );

        return;
      }

      // -------------------------------
      // AMD CPU
      // -------------------------------

      if (action === "cpuamd") {
        state.cpu = "amd";

        await interaction.update(
          createPanel(state)
        );

        return;
      }

      // -------------------------------
      // INTEL CPU
      // -------------------------------

      if (action === "cpuintel") {
        state.cpu = "intel";

        await interaction.update(
          createPanel(state)
        );

        return;
      }

      // -------------------------------
      // NVIDIA GPU
      // -------------------------------

      if (action === "gpunvidia") {
        state.gpu = "nvidia";

        await interaction.update(
          createPanel(state)
        );

        return;
      }

      // -------------------------------
      // AMD GPU
      // -------------------------------

      if (action === "gpuamd") {
        state.gpu = "amd";

        await interaction.update(
          createPanel(state)
        );

        return;
      }

      // =================================================
      // PC OLUŞTUR
      // =================================================

      if (action === "build") {

        if (!state.budget) {

          await interaction.reply({
            content:
              "💰 Önce bütçeni gir.",
            ephemeral: true
          });

          return;
        }

        if (!state.game) {

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
              .setTitle(
                "🔎 PC BUILDER ÇALIŞIYOR"
              )
              .setDescription(
                "Canlı fiyatlar aranıyor...\n\n" +
                "🧠 İşlemci\n" +
                "🎮 Ekran kartı\n" +
                "🧩 RAM\n" +
                "💾 SSD\n" +
                "🔧 Anakart\n" +
                "⚡ PSU\n" +
                "📦 Kasa\n\n" +
                "Fiyat avına çıktım. 🕵️"
              )
          ],

          components: []
        });

        try {

          const queries =
            getQueries(state);

          // =================================================
          // BÜTÇE DAĞILIMI
          // =================================================

          const budget =
            state.budget;

          const cpuLimit =
            Math.floor(budget * 0.20);

          const gpuLimit =
            Math.floor(budget * 0.40);

          const ramLimit =
            Math.floor(budget * 0.08);

          const ssdLimit =
            Math.floor(budget * 0.08);

          const motherboardLimit =
            Math.floor(budget * 0.12);

          const psuLimit =
            Math.floor(budget * 0.07);

          const caseLimit =
            Math.floor(budget * 0.05);

          // =================================================
          // CANLI ARAMA
          // =================================================

          const [
            cpu,
            gpu,
            ram,
            ssd,
            motherboard,
            psu,
            pcCase
          ] = await Promise.all([

            findProduct(
              queries.cpu,
              cpuLimit
            ),

            findProduct(
              queries.gpu,
              gpuLimit
            ),

            findProduct(
              queries.ram,
              ramLimit
            ),

            findProduct(
              queries.ssd,
              ssdLimit
            ),

            findProduct(
              queries.motherboard,
              motherboardLimit
            ),

            findProduct(
              queries.psu,
              psuLimit
            ),

            findProduct(
              queries.case,
              caseLimit
            )
          ]);

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

          // =================================================
          // EKSİK PARÇA
          // =================================================

          const missing =
            parts.filter(
              part => !part.product
            );

          if (missing.length) {

            await interaction.editReply({

              embeds: [
                new EmbedBuilder()
                  .setTitle(
                    "❌ Sistem oluşturulamadı"
                  )
                  .setDescription(
                    "Bütçene uygun tüm parçaları canlı olarak bulamadım.\n\n" +
                    missing
                      .map(
                        x => x.name
                      )
                      .join("\n")
                  )
              ],

              components: []
            });

            return;
          }

          // =================================================
          // TOPLAM
          // =================================================

          const total =
            parts.reduce(
              (sum, part) =>
                sum +
                Number(
                  part.product.price
                ),
              0
            );

          // =================================================
          // BÜTÇE KONTROLÜ
          // =================================================

          if (total > budget) {

            await interaction.editReply({

              embeds: [
                new EmbedBuilder()
                  .setTitle(
                    "💸 Bütçe aşımı"
                  )
                  .setDescription(
                    `💰 Bütçe: **${money(budget)}**\n` +
                    `💵 Sistem: **${money(total)}**\n\n` +
                    "Bu sistemi göndermiyorum çünkü **bütçeyi geçiyor.**"
                  )
              ],

              components: []
            });

            return;
          }

          // =================================================
          // SONUÇ
          // =================================================

          const embed =
            new EmbedBuilder()
              .setTitle(
                "🚀 PC BUILDER SONUCU"
              )
              .setDescription(

                `🎮 **Oyun:** ${
                  games[state.game]
                }\n` +

                `💰 **Bütçe:** ${
                  money(budget)
                }\n` +

                `📦 **Paket:** ${
                  state.package === "full"
                    ? "🎒 Wraith Full Paket"
                    : "🖥️ Sadece Kasa"
                }\n\n` +

                `💵 **Toplam:** ${
                  money(total)
                }\n` +

                `🟢 **Kalan:** ${
                  money(
                    budget - total
                  )
                }\n\n` +

                "━━━━━━━━━━━━━━━━━━"
              )
              .setFooter({
                text:
                  budget > 120000
                    ? "💀 120K+ bölgesi: Cüzdan güvenlik protokolünü başlattı."
                    : "PC Builder • Canlı fiyatlar"
              });

          // =================================================
          // PARÇALAR
          // =================================================

          for (const part of parts) {

            const product =
              part.product;

            embed.addFields({

              name: part.name,

              value:
                `**${product.title}**\n` +
                `💰 **${money(product.price)}**\n` +
                `🏪 ${product.brand || "Bilinmiyor"}\n` +
                `[🛒 Ürüne git](${product.url})`,

              inline: false
            });
          }

          // =================================================
          // 120K+ MİZAH
          // =================================================

          if (budget > 120000) {

            embed.addFields({

              name: "💀 120K+ BÖLGESİ",

              value:
                "Bu bütçede artık PC toplamıyorsun, " +
                "ekran kartına tapu çıkartıyorsun. 😭",

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
                  "❌ Canlı fiyat hatası"
                )
                .setDescription(
                  "ReefAPI'den fiyatları alırken hata oluştu.\n\n" +
                  `\`${error.message}\``
                )
            ],

            components: []
          });
        }

        return;
      }
    }

    // =================================================
    // OYUN SEÇİMİ
    // =================================================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("game|")
    ) {

      const stateId =
        interaction.customId.split("|")[1];

      const state =
        decodeState(stateId);

      state.game =
        interaction.values[0];

      await interaction.update(
        createPanel(state)
      );

      return;
    }
  }
);

// =====================================================
// BAŞLAT
// =====================================================

client.login(
  DISCORD_TOKEN
);