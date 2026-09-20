# Discord Control Suite — 


## الموجود حاليًا

- Discord OAuth Login للداشبورد.
- ملف مركزي للمتغيرات والـPORT والأسرار: `src/config/settings.js` ويقرأ من `.env`.
- ملف مركزي للألوان والإيموجي والثوابت: `src/config/constants.js`.
- Tickets قابل للتخصيص: روم اللوحة، Category، Transcript، رولات الإدارة، العنوان، الوصف، اللون، الصورة، نص/إيموجي/ستايل الزر، اسم التكت، رسالة الترحيب، زر الإغلاق.
- Message Center: نشر رسالة عادية أو Embed، وتعديل/حذف آخر رسائل البوت.
- Role Manager: تعديل الاسم واللون وHoist وMentionable وكل Permissions للرولات القابلة للتعديل، مع نسخ Permissions إلى عدة رولات.
- Event Publisher: نص فوق الرسالة، عنوان، وصف، عنوان فرعي ونص تحته، لون Embed، صورة في النهاية وFooter.
- Mod Guide: إنشاء/تحديث روم `bot-mod-guide` فيه شرح للمشرفين.
- Dashboard Audit: يحفظ من قام بتغييرات الداشبورد داخل `data/settings.json`.

> Discord لا يسمح بتلوين حروف النص العادي بحرية. لذلك خيار اللون في الفعاليات والرسائل يحدد لون الـEmbed.

## الهيكل

```text
src/
├── index.js
├── config/
│   ├── settings.js
│   └── constants.js
├── core/
│   ├── store.js
│   ├── audit.js
│   ├── access.js
│   └── moduleLoader.js
├── modules/
│   ├── tickets/
│   ├── messages/
│   ├── roles/
│   ├── eventsPublisher/
│   └── modGuide/
└── dashboard/
    ├── app.js
    ├── auth.js
    ├── middleware.js
    ├── routes/
    ├── views/
    └── public/
```

## التشغيل

1. انسخ `.env.example` إلى `.env`.
2. ضع Token وApplication ID وClient Secret ورابط callback.
3. في Discord Developer Portal أضف نفس `DISCORD_REDIRECT_URI` داخل OAuth2 Redirects.
4. فعّل **Server Members Intent** إذا أردت توسعة ميزات الأعضاء لاحقًا.
5. شغّل:

```bash
npm install
npm start
```

## مثال `.env`

```env
DISCORD_TOKEN=YOUR_TOKEN
DISCORD_CLIENT_ID=YOUR_APPLICATION_ID
DISCORD_CLIENT_SECRET=YOUR_CLIENT_SECRET
DISCORD_REDIRECT_URI=https://YOUR-CODESPACE-3000.app.github.dev/auth/callback
PORT=3000
SESSION_SECRET=LONG_RANDOM_STRING
```

## ملاحظة الرولات

Discord يمنع البوت من تعديل رول أعلى من رول البوت أو Managed Role. ضع رول البوت فوق الرولات التي تريد التحكم بها ومنحه `Manage Roles`.
