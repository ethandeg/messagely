/** User class for message.ly */

const db = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { BCRYPT_WORK_FACTOR, SECRET_KEY } = require("../config");
const ExpressError = require("../expressError");


/** User of the site. */

class User {
  constructor(username, password, first_name, last_name, phone, join_at, last_login_at){
    this.username = username;
    this.password = password;
    this.first_name = first_name;
    this.last_name = last_name;
    this.phone = phone;
    this.join_at = join_at;
    this.last_login_at = last_login_at;
  }

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register(username, password, first_name, last_name, phone) {

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR); 
    const date = new Date()
    const result = await db.query(
      `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
      VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp) RETURNING username
      `,[username, hashedPassword, first_name, last_name, phone])
    const user = result.rows[0]
    if(user){
      const newUser = new User(username, password, first_name, last_name, phone, date, date)
      const token = jwt.sign({ username }, SECRET_KEY);
      return {token, newUser}
    }
    throw new ExpressError("There seems to be something wrong with the credentials", 401)
  }




  static async authenticate(username, password) {
    const results = await db.query(`SELECT username, password
                                    FROM users
                                    WHERE username = $1`, [username])
    const user = results.rows[0]
    if(user){
      if(await bcrypt.compare(password, user.password)){
        const loggedInUser = await db.query(`UPDATE users SET last_login_at = $1 WHERE username = $2 RETURNING *`, [new Date(), username])
        const token = jwt.sign({username}, SECRET_KEY)
        return {token, loggedInUser: loggedInUser.rows}
      }
      throw new ExpressError("Invalid Password", 401)
    }
    throw new ExpressError("No such username exists in our system", 401)
   }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(`UPDATE users SET last_login_at =$1 WHERE username = $2 RETURNING *`, [new Date(), username])
    const user = result.rows[0]
    return new User(user.username, user.password, user.first_name, user.last_name, user.phone, user.join_at, user.last_login_at)
   }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const results = await db.query(`
                                    SELECT username, first_name, last_name, phone, join_at, last_login_at 
                                    FROM users`)
    return results.rows
   }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(`
                                  SELECT username, first_name, last_name, phone, join_at, last_login_at
                                  FROM users
                                  WHERE username = $1`, [username])
    if(result.rows[0]){
      return result.rows[0]
    }
    throw new ExpressError("No such username in our system", 404)
   }

  /** Return messages from this user.
   *
   * [{id, to_username, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) { 
    const results = await db.query(`
                                    SELECT m.id, m.to_username, m.body, m.sent_at, m.read_at,
                                            u.username, u.first_name, u.last_name, u.phone
                                            FROM messages AS m
                                            JOIN users AS u ON m.to_username = u.username
                                            WHERE from_username = $1
                                    `, [username])
    
    const messages = []
    for(let result of results.rows){
      let newObj = {
        id: result.id,
        body: result.body,
        sent_at: result.sent_at,
        read_at: result.read_at,
        to_username: {username: result.to_username, firstName: result.first_name, lastName: result.last_name, phone: result.phone}
      }
      messages.push(newObj)
    
    }
    return messages
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {id, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    const results = await db.query(`
                                    SELECT m.id, m.from_username, m.body, m.sent_at, m.read_at,
                                            u.username, u.first_name, u.last_name, u.phone
                                            FROM messages AS m
                                            JOIN users AS u ON m.from_username = u.username
                                            WHERE to_username = $1
                                    `, [username])
    
    const messages = []
    for(let result of results.rows){
      let newObj = {
        id: result.id,
        body: result.body,
        sent_at: result.sent_at,
        read_at: result.read_at,
        from_username: {username: result.from_username, firstName: result.first_name, lastName: result.last_name, phone: result.phone}
      }
      messages.push(newObj)
    
    }
    return messages
    

   }
}


module.exports = User;