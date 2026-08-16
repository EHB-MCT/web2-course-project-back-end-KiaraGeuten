# A Collector's Dream ✨

Welcome to a Collector's dream, a for now Riftbound-themed collection API made for collectors and players who want to keep track of their cards, decks, trades, and wishlist.

With this API, you can collect Riftbound cards, build decks, track trades, and keep an eye on cards you're still looking for. The backend is built with Node, Express, and MongoDB and JavaScript.

Website URL: https://web2-course-project-back-end-kiarageuten.onrender.com/

## Up & Running 🏃‍➡️

Install the dependencies and start the server:

npm
nodemon
dotenv
mongodb
multer
express
cors

## API

The API is split into separate route files depending on the functionality.

GET /cards

GET /search

GET /champions/:tag

GET /chase

POST /chase/:cardId

DELETE /chase/:cardId

GET /count

GET /count/set

GET /deck

GET /deck/:name

POST /deck

POST /deck/import

PUT /deck/:name/:cardId

DELETE /deck/:name

GET /collection

POST /collection

PUT /collection/:cardId

DELETE /collection/:cardId

POST /import

GET /trade

POST /trade

DELETE /trade/:cardId

GET /trades

POST /trades

GET /wishlist

POST /wishlist

DELETE /:cardId

The API routes are separated into different files to keep the backend organised:

routes/
├── achievements.js
├── cards.js
├── chase.js
├── collection.js
├── deck.js
├── import.js
├── trade.js
├── trades.js
└── wishlist.js

## Main purpose

The API is built around a Riftbound collector's experience. Users can:

🃏 Collect cards and manage their collection
⚔️ Build and manage decks
🔎 Search for Riftbound cards
⭐ Track chase cards
❤️ Create a wishlist
🤝 Track trades
🏆 Earn and manage achievements
📥 Import collection data

The goal is to bring the different parts of collecting and playing Riftbound together in one place.

## Database 🗄️

The application uses MongoDB to store and manage the data.

MongoDB is used for information such as:

Riftbound cards
Collections
Binders
Decks
Trade
Trades
Wishlists
Chase cards

## Sources

retrieving from database used in server.js > line 54 > https://www.mongodb.com/docs/php-library/current/crud/query/retrieve/

putting readme as html used in server.js > line 135-137 > https://chatgpt.com/share/695868e2-0c64-8008-9916-48ca987654cf

seperating server.js in different files used in server.js, database.js, routes > https://chatgpt.com/share/6a7213a5-a8e0-83eb-9237-ea3ee6265def

using riftbound cards used in cards.js > https://riftcodex.com/

batching used in cards.js > https://chatgpt.com/share/6a72232b-1974-83eb-a0b0-7646f8f7e983

using search opperations used in cards.js > https://www.mongodb.com/docs/manual/reference/mql/query-predicates/

typeof used in cards.js > https://www.w3schools.com/js/js_typeof.asp

trim used in cards.js > https://dev.to/technoph1le/the-javascript-stringtrim-method-explained-4b61#how-it-works

value mapping used in cards.js > https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map

deleting docs used in chase.js > https://www.mongodb.com/docs/drivers/node/v6.x/crud/delete/

counting quantity in array used in collection.js > https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce

collection properties used in collection.js > https://www.mongodb.com/docs/drivers/node/current/crud/query/count/
https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/

date/timestamp used in deck.js > https://www.mongodb.com/community/forums/t/how-to-use-and-format-the-timestamp-in-javascript/132717/2

set list usage used in decks.js > https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set?utm_source=chatgpt.com

http request used in deck.js > https://en.wikipedia.org/wiki/List_of_HTTP_status_codes

uploading files to routes used in deck.js > https://www.npmjs.com/package/multer
