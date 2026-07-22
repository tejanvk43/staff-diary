const bcrypt = require('bcrypt');

const password = "Urce@2026";
const hash = "$2b$10$YWVgeHcHH7Znsnuw/1jgkO3sDVJfz9g6cS9CgoDzi3PAGuGW0uuAe";

bcrypt.compare(password, hash).then(result => {
    console.log(result); // true or false
});