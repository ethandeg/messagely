const express = require("express");
const router = new express.Router();
const ExpressError = require("../expressError");
const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { BCRYPT_WORK_FACTOR, SECRET_KEY } = require("../config");
const User = require('../models/user')

/** POST /login - login: {username, password} => {token}
 *
 * Make sure to update their last-login!
 *
 **/
router.post("/login", async (req, res, next) => {
    try {
        const {username, password} = req.body;
        if(!username || !password){
            throw new ExpressError("Username and Password Required", 401)
        }
        const {token, loggedInUser} = await User.authenticate(username, password)
        return res.json({_token:token, loggedInUser})
    } catch(e){
        return next(e)
    }
})

/** POST /register - register user: registers, logs in, and returns token.
 *
 * {username, password, first_name, last_name, phone} => {token}.
 *
 *  Make sure to update their last-login!
 */

 router.post('/register', async (req, res, next) => {
     try {
        const {username, password, first_name, last_name, phone} = req.body;
        if(!username || !password || !first_name || !last_name || !phone){
            throw new ExpressError("Please provide a username, password, first_name, last_name, and phone", 401)
        }
        const {token, newUser} = await User.register(username, password, first_name, last_name, phone)
        return res.json({_token: token, newUser})


     } catch(e){
         return next(e)
     }
 })



module.exports = router;