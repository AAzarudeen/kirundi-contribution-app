# 🇧🇮 Ijwi ry'Ikirundi AI: Contribution Hub

<div align="center">

<img src="icon.png" alt="Kirundi AI Logo" width="80" height="80">

**A web application for collecting Kirundi language contributions to help build AI language models**

[![Hugging Face](https://img.shields.io/badge/🤗-Hugging%20Face-yellow)](https://huggingface.co/datasets/samandari/Kirundi_Open_Speech_Dataset)
[![Kirundi](https://img.shields.io/badge/Language-Kirundi-green)](https://en.wikipedia.org/wiki/Kirundi)

</div>

## 📖 Overview

The **Ijwi ry'Ikirundi AI Contribution Hub** helps crowdsource Kirundi language data for AI model training. Community members can contribute translations and sentence pairs to preserve and advance the Kirundi language.

### 🎯 Easy Level: Kirundi to French Translation

- Translate existing Kirundi phrases to French
- Live data from Hugging Face dataset
- Progress tracking with localStorage
- Downloads as `Kirundi_To_French.csv`
- **Report/correct Kirundi phrases:** Users can flag and suggest corrections for Kirundi sentences
- Error and completion messages are always mutually exclusive (never both visible)
- All error messages default to English

### 🔄 Medium Level: French to Kirundi Translation

- Translate French sentences to Kirundi
- Duplicate checking against existing database
- Downloads as `French_To_Kirundi.csv`
- Error and completion messages are always mutually exclusive

### ✍🏾 Hard Level: Add New Sentences

- Create original Kirundi-French sentence pairs
- Input validation (both fields required, minimum 4 words recommended)
- Duplicate checking: prevents submission of Kirundi sentences already in the database

**All levels include:**

- Keyboard shortcuts (Ctrl+Enter to submit, Escape to skip)
- Mobile-responsive design
- Language toggle button (FR/EN) for all instructions and feedback

## 🚀 Quick Start

### Option 1: Direct Use

1. Open `index.html` in your browser
2. Choose your contribution level
3. Follow on-screen instructions

### Option 2: Local Server (Recommended)

```bash
cd Kirundi_Game
python -m http.server 8000
# Visit: http://localhost:8000
```

## 🛠 Technical Details

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Data Source**: Live data from Hugging Face
- **Storage**: Browser localStorage for progress tracking
- **Deployment**: GitHub Pages compatible

## 💾 Data Format

All CSV files use standardized headers:

#### Easy Level (Kirundi → French)

```csv
Original_Kirundi,Corrected_Kirundi,French_Translation
"Muraho, amakuru?","Muraho, amakuru?","Bonjour, comment allez-vous?"
```

#### Medium Level (French → Kirundi)

```csv
Kirundi_Transcription,French_Translation
"Ndagukunda cane.","Je t'aime beaucoup."
```

#### Hard Level (New Sentences)

```csv
Kirundi_Transcription,French_Translation
"Ndagukunda cane.","Je t'aime beaucoup."
```

All downloads and submissions use these formats to ensure compatibility with the central dataset.

## 🫱🏽‍🫲🏿 Contributing

**Contact**: 📱 WhatsApp +257 77 568 903  
**Team**: Ijwi Ry'Ikirundi AI Team

## ❓ Troubleshooting & FAQ

- **Q: Why do I see both an error and a congratulations/completion message at the same time?**

  - A: This should never happen. The app now ensures only one is visible at a time. If you see both, try a hard refresh (Ctrl+Shift+R) or clear your browser cache.

- **Q: How can I report a problem with a Kirundi phrase?**
  - A: In Easy Level, click the "Report a problem" button below the Kirundi phrase to submit a correction or flag an issue.

### 📞 Support

For questions, feedback, or technical support:

- 💬 **WhatsApp**: [+257 77 568 903](https://wa.me/25777568903)
- 📧 **Email**: Junior_julescesar10@hotmail.com

---

<div align="center">

**🇧🇮 Preserving Heritage • Building Future • Empowering Community 🇧🇮**

© 2025 Ijwi Ry'Ikirundi AI Team

</div>
This app is ready for deployment on GitHub Pages or any static hosting service. Simply upload all files to your web server or GitHub repository.
