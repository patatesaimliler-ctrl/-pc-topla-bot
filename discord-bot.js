const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, StringSelectMenuBuilder, TextInputBuilder, ModalBuilder, ButtonStyle, TextInputStyle } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages] });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Geçici session storage
const userSessions = {};

const OYUNLAR = ['VALORANT', 'CS2', 'Minecraft', 'Fortnite', 'GTA V', 'Red Dead Redemption 2', 'EA SPORTS FC', 'Cyberpunk 2077'];
const CPULAR = ['AMD', 'Intel'];
const GPULAR = ['NVIDIA', 'AMD'];

client.once('ready', () => {
  console.log(`✅ Bot giriş yaptı: ${client.user.tag}`);
  
  // Slash command'ı kaydet
  client.application.commands.create({
    name: 'pctopla',
    description: 'Discord PC Toplama Botu',
  }).catch(err => console.error('Komut kayıt hatası:', err));
});

client.on('interactionCreate', async (interaction) => {
  try {
    // /pctopla command
    if (interaction.isCommand() && interaction.commandName === 'pctopla') {
      const userId = interaction.user.id;
      
      // Session oluştur
      userSessions[userId] = {
        budget: null,
        game: null,
        cpu: null,
        gpu: null
      };

      const embed = new EmbedBuilder()
        .setColor('#1f1f1f')
        .setTitle('🖥️ PC TOPLAMA PANELİ')
        .setDescription('Aşağıdaki seçenekleri kullanarak hayalinizdeki PC\'yi konfigüre edin.')
        .addFields(
          { name: '💰 Bütçe', value: 'Henüz seçilmedi', inline: true },
          { name: '🎮 Oyun', value: 'Henüz seçilmedi', inline: true },
          { name: '🧠 CPU Markası', value: 'Henüz seçilmedi', inline: true },
          { name: '🎮 GPU Markası', value: 'Henüz seçilmedi', inline: true }
        )
        .setFooter({ text: 'Tüm seçimleri tamamladıktan sonra "PC\'yi Oluştur" butonuna basın' });

      // Bütçe button
      const budgetButton = new ButtonBuilder()
        .setCustomId('budget_button')
        .setLabel('💰 Bütçe Belirle')
        .setStyle(ButtonStyle.Primary);

      // Oyun select
      const gameSelect = new StringSelectMenuBuilder()
        .setCustomId('game_select')
        .setPlaceholder('🎮 Oyun seçin')
        .addOptions(
          OYUNLAR.map(oyun => ({
            label: oyun,
            value: oyun
          }))
        );

      // CPU select
      const cpuSelect = new StringSelectMenuBuilder()
        .setCustomId('cpu_select')
        .setPlaceholder('🧠 CPU Markası')
        .addOptions(
          CPULAR.map(cpu => ({
            label: cpu,
            value: cpu
          }))
        );

      // GPU select
      const gpuSelect = new StringSelectMenuBuilder()
        .setCustomId('gpu_select')
        .setPlaceholder('🎮 GPU Markası')
        .addOptions(
          GPULAR.map(gpu => ({
            label: gpu,
            value: gpu
          }))
        );

      // PC Oluştur button
      const buildButton = new ButtonBuilder()
        .setCustomId('build_button')
        .setLabel('🚀 PC\'yi Oluştur')
        .setStyle(ButtonStyle.Success);

      const row1 = new ActionRowBuilder().addComponents(budgetButton);
      const row2 = new ActionRowBuilder().addComponents(gameSelect);
      const row3 = new ActionRowBuilder().addComponents(cpuSelect);
      const row4 = new ActionRowBuilder().addComponents(gpuSelect);
      const row5 = new ActionRowBuilder().addComponents(buildButton);

      await interaction.reply({ embeds: [embed], components: [row1, row2, row3, row4, row5], ephemeral: false });
    }

    // Bütçe Modal
    if (interaction.isButton() && interaction.customId === 'budget_button') {
      const modal = new ModalBuilder()
        .setCustomId('budget_modal')
        .setTitle('Bütçe Belirleyin');

      const budgetInput = new TextInputBuilder()
        .setCustomId('budget_input')
        .setLabel('Bütçenizi TL cinsinden girin')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Örneğin: 75000')
        .setRequired(true);

      const row = new ActionRowBuilder().addComponents(budgetInput);
      modal.addComponents(row);

      await interaction.showModal(modal);
    }

    // Bütçe Modal Submit
    if (interaction.isModalSubmit() && interaction.customId === 'budget_modal') {
      const userId = interaction.user.id;
      const budget = parseInt(interaction.fields.getTextInputValue('budget_input'));

      if (isNaN(budget) || budget <= 0) {
        return await interaction.reply({ content: '❌ Geçerli bir bütçe girin', ephemeral: true });
      }

      userSessions[userId].budget = budget;

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ Bütçeniz: **${budget.toLocaleString('tr-TR')} TL** olarak ayarlandı.`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Oyun Seçimi
    if (interaction.isStringSelectMenu() && interaction.customId === 'game_select') {
      const userId = interaction.user.id;
      const game = interaction.values[0];

      userSessions[userId].game = game;

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ Oyun: **${game}** olarak seçildi.`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // CPU Seçimi
    if (interaction.isStringSelectMenu() && interaction.customId === 'cpu_select') {
      const userId = interaction.user.id;
      const cpu = interaction.values[0];

      userSessions[userId].cpu = cpu;

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ CPU Markası: **${cpu}** olarak seçildi.`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // GPU Seçimi
    if (interaction.isStringSelectMenu() && interaction.customId === 'gpu_select') {
      const userId = interaction.user.id;
      const gpu = interaction.values[0];

      userSessions[userId].gpu = gpu;

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setDescription(`✅ GPU Markası: **${gpu}** olarak seçildi.`);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // PC Oluştur
    if (interaction.isButton() && interaction.customId === 'build_button') {
      const userId = interaction.user.id;
      const session = userSessions[userId];

      // Validasyon
      if (!session.budget || !session.game || !session.cpu || !session.gpu) {
        return await interaction.reply({
          content: '❌ Lütfen tüm seçimleri tamamlayın',
          ephemeral: true
        });
      }

      // Status message
      const statusEmbed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⏳ PC Yapılandırılıyor...')
        .addFields(
          { name: '🔎', value: 'İnternette güncel fiyatlar araştırılıyor...' },
          { name: '🧩', value: 'Parçalar karşılaştırılıyor...' },
          { name: '🔧', value: 'Uyumluluk kontrol ediliyor...' },
          { name: '💰', value: 'Bütçe kontrol ediliyor...' }
        );

      await interaction.reply({ embeds: [statusEmbed] });

      // Gemini ile PC oluştur
      try {
        const pcConfig = await buildPCWithGemini(session);
        
        if (pcConfig.error) {
          const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Hata')
            .setDescription(pcConfig.error);
          
          return await interaction.editReply({ embeds: [errorEmbed] });
        }

        const resultEmbed = createPCEmbed(pcConfig, session);
        await interaction.editReply({ embeds: [resultEmbed] });

      } catch (error) {
        console.error('PC Oluşturma Hatası:', error);
        const errorEmbed = new EmbedBuilder()
          .setColor('#FF0000')
          .setTitle('❌ Hata')
          .setDescription('PC yapılandırılırken bir hata oluştu. Lütfen tekrar deneyin.');
        
        await interaction.editReply({ embeds: [errorEmbed] });
      }
    }

  } catch (error) {
    console.error('Interaction Error:', error);
  }
});

async function buildPCWithGemini(session) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
GÖREV: Türkiye'deki güncel fiyatları araştırarak oyun sistemi önerir.

KRITER:
- Bütçe: ${session.budget} TL
- Oyun: ${session.game}
- CPU Markası: ${session.cpu}
- GPU Markası: ${session.gpu}

GÖREVLERİN:
1. İnternetten Türkiye'deki güncel ürün fiyatlarını ara
2. Akakçe, Hepsiburada, Trendyol, Vatan Bilgisayar, İtopya, Teknosa vb. mağazalardan fiyat bul
3. Uyumlu parçalar seç
4. Bütçeyi ASLA aşma
5. Oyuna göre optimize et
6. Gerçek model isimlerini ve güncel fiyatlarını kullan

PARÇALAR:
- CPU (Intel veya AMD - tercihine göre)
- GPU (NVIDIA veya AMD - tercihine göre)
- RAM (DDR5, 16-32GB)
- SSD (1TB+ NVMe)
- Anakart (B/H serisi, uyumlu soket)
- PSU (Güvenilir, GPU için yeterli)
- Kasa (ATX uyumlu)

KURALAR:
- Wraith soğutucusu KULLANMA
- Monitor, klavye, mouse, kulaklık EKLEME
- CPU soketi ↔ Anakart uyumlu olmalı
- RAM ↔ Anakart uyumlu olmalı
- PSU GPU için yeterli olmalı
- Bütçeyi KESINLIKLE AŞMA

ÇIKTI FORMATI (SADECE JSON, BAŞKA YAZMA):
{
  "cpu": {
    "model": "Ryzen 5 7500F",
    "price": 12999,
    "store": "Akakçe",
    "url": "https://example.com"
  },
  "gpu": {
    "model": "RTX 4060 8GB",
    "price": 15499,
    "store": "Hepsiburada",
    "url": "https://example.com"
  },
  "ram": {
    "model": "Kingston FURY 32GB DDR5 6000MHz",
    "price": 8999,
    "store": "Trendyol",
    "url": "https://example.com"
  },
  "ssd": {
    "model": "WD Black SN850X 1TB",
    "price": 6999,
    "store": "Vatan Bilgisayar",
    "url": "https://example.com"
  },
  "motherboard": {
    "model": "MSI B650M MORTAR WIFI",
    "price": 9499,
    "store": "İtopya",
    "url": "https://example.com"
  },
  "psu": {
    "model": "Corsair 750W 80+ Gold",
    "price": 5999,
    "store": "Teknosa",
    "url": "https://example.com"
  },
  "case": {
    "model": "Corsair Spec-Delta RGB",
    "price": 3999,
    "store": "Akakçe",
    "url": "https://example.com"
  },
  "total": 64494,
  "remaining": ${session.budget - 64494},
  "performance_note": "Bu sistem ${session.game} için yüksek performans sunar."
}
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [
        {
          googleSearch: {}
        }
      ]
    });

    const responseText = result.response.text();
    
    // JSON'u çıkat
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Gemini Response:', responseText);
      return { error: 'Gemini\'den geçerli sonuç alınamadı' };
    }

    const pcConfig = JSON.parse(jsonMatch[0]);

    // Bütçe kontrolü
    if (pcConfig.total > session.budget) {
      return { 
        error: `❌ Yapılandırılan sistem bütçeyi aşıyor (${pcConfig.total.toLocaleString('tr-TR')} TL > ${session.budget.toLocaleString('tr-TR')} TL). Daha yüksek bir bütçe seçin.` 
      };
    }

    return pcConfig;

  } catch (error) {
    console.error('Gemini Error:', error);
    return { 
      error: 'Gemini API hatası. Lütfen API key\'ini kontrol et ve tekrar dene.\n\nHata: ' + error.message 
    };
  }
}

function createPCEmbed(config, session) {
  const embed = new EmbedBuilder()
    .setColor('#00FF00')
    .setTitle('🖥️ PC HAZIR!')
    .addFields(
      { name: '🎮 Oyun', value: session.game, inline: false },
      { name: '💰 Bütçe', value: `${session.budget.toLocaleString('tr-TR')} TL`, inline: false },
      { name: '\u200B', value: '\u200B' }
    );

  // CPU
  embed.addFields({
    name: '🧠 İşlemci',
    value: `**${config.cpu.model}**\n${config.cpu.price.toLocaleString('tr-TR')} TL\n🏪 ${config.cpu.store}`,
    inline: false
  });

  // GPU
  embed.addFields({
    name: '🎮 Ekran Kartı',
    value: `**${config.gpu.model}**\n${config.gpu.price.toLocaleString('tr-TR')} TL\n🏪 ${config.gpu.store}`,
    inline: false
  });

  // RAM
  embed.addFields({
    name: '🧩 RAM',
    value: `**${config.ram.model}**\n${config.ram.price.toLocaleString('tr-TR')} TL\n🏪 ${config.ram.store}`,
    inline: false
  });

  // SSD
  embed.addFields({
    name: '💾 SSD',
    value: `**${config.ssd.model}**\n${config.ssd.price.toLocaleString('tr-TR')} TL\n🏪 ${config.ssd.store}`,
    inline: false
  });

  // Anakart
  embed.addFields({
    name: '🔧 Anakart',
    value: `**${config.motherboard.model}**\n${config.motherboard.price.toLocaleString('tr-TR')} TL\n🏪 ${config.motherboard.store}`,
    inline: false
  });

  // PSU
  embed.addFields({
    name: '⚡ Güç Kaynağı',
    value: `**${config.psu.model}**\n${config.psu.price.toLocaleString('tr-TR')} TL\n🏪 ${config.psu.store}`,
    inline: false
  });

  // Kasa
  embed.addFields({
    name: '📦 Kasa',
    value: `**${config.case.model}**\n${config.case.price.toLocaleString('tr-TR')} TL\n🏪 ${config.case.store}`,
    inline: false
  });

  // Özet
  embed.addFields({ name: '\u200B', value: '\u200B' });
  embed.addFields(
    { name: '💰 TOPLAM', value: `**${config.total.toLocaleString('tr-TR')} TL**`, inline: true },
    { name: '🟢 KALAN', value: `**${config.remaining.toLocaleString('tr-TR')} TL**`, inline: true }
  );

  if (config.performance_note) {
    embed.addFields(
      { name: '\u200B', value: '\u200B' },
      { name: '📝 Not', value: config.performance_note }
    );
  }

  if (session.budget >= 120000) {
    embed.setFooter({ text: '💎 120K+ bütçe açıldı. Ekran kartı artık sistemin patronu!' });
  } else {
    embed.setFooter({ text: 'Başarılı bir PC yapılandırması oluşturuldu!' });
  }

  return embed;
}

client.login(process.env.DISCORD_TOKEN);
