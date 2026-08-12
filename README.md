[![Open in Codespaces](https://classroom.github.com/assets/launch-codespace-2972f46106e565e64193e422d61a12cf1da4916b45550586e14ef0a7c637dd04.svg)](https://classroom.github.com/open-in-codespaces?assignment_repo_id=21976594)

# A Collector's Dream ✨

VibeTribe is a web application that allows users to create accounts, log in, and manage personal information including concerts, groups, and preferences. It uses **MongoDB** for data storage and **Express.js** as the backend server.

**Website URL:** [Api-vibetribe.be](https://web2-course-project-back-end-kiarageuten.onrender.com/)

## Up & running 🏃‍➡️

run nodemon server.js

### Endpoints

/sign-up
stored user in database

/update-user-info/:username
updates info about 1 user

/login
checks credentials

/user
gets all info about 1 user

## Sources 🗃️

retrieving from database used in server.js > line 54 > https://www.mongodb.com/docs/php-library/current/crud/query/retrieve/
putting readme as html used in server.js> line 135-137 > https://chatgpt.com/share/695868e2-0c64-8008-9916-48ca987654cf
seperating server.js in different files used in sever.js, database.js, routes > https://chatgpt.com/share/6a7213a5-a8e0-83eb-9237-ea3ee6265def
using riftbound cards used in cards.js> https://riftcodex.com/
batching used in cards.js >https://chatgpt.com/share/6a72232b-1974-83eb-a0b0-7646f8f7e983
using search opperations used in cards.js > https://www.mongodb.com/docs/manual/reference/mql/query-predicates/
typeof used in cards.js > https://www.w3schools.com/js/js_typeof.asp
trim used in cards.js > https://dev.to/technoph1le/the-javascript-stringtrim-method-explained-4b61#how-it-works
value mapping used in cards.js > https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
deleting docs used in chase.js >https://www.mongodb.com/docs/drivers/node/v6.x/crud/delete/
counting quantity in array used in colection.js > https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
