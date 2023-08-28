const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const path = require("path");
const fs = require("fs/promises");

const { User } = require("../models/user");
const { HttpError, ctrlWrapper } = require("../helpers");

require('dotenv').config();
const {SECRET_KEY} = process.env;

const avatarsDir = path.join(__dirname, "../", "public", "avatars");

const register = async (req, res) => {
  const { email, password } = req.body;  
  const user = await User.findOne({ email }); //первіряємо унікальність email
  console.log("email:", email);
  console.log("user:", user);

  if (user){
    throw HttpError(409, "Email already in use");
  }

  // const salt = await bcrypt.genSalt(10);
  // console.log(salt); //кількість "солі" - рівень складності хешування (10 - default) 
  // const hashPassword = await bcrypt.hash(password, salt);
  const hashPassword = await bcrypt.hash(password, 10); //хешування password
  console.log(hashPassword);
  const avatarURL = gravatar.url(email);
 
  const newUser = await User.create({...req.body, password: hashPassword, avatarURL});

  res.status(201).json({
    email: newUser.email,
    name: newUser.name,
  })
}

const login = async (req, res) => {
  const { email, password } = req.body;
  // console.log("email:", email);
  const user = await User.findOne({ email });
  if(!user){
    throw HttpError(401, "Email invalid");
  }
  const passwordCompare = await bcrypt.compare(password, user.password);
  if(!passwordCompare) {
    throw HttpError(401, "Password invalid");
  }
  // створюємо token
  const payload = {
    id: user._id,
  }
  const token = jwt.sign(payload, SECRET_KEY, {expiresIn: "23h"}); //{expiresIn: "23h"} - час можливості використання
  // const decodeToken = jwt.decode(token);
  await User.findByIdAndUpdate(user._id, {token});
  res.json({
    token,
  })
};

const getCurrent = async (req, res) => {
  const {email, name} = req.user;

  res.json({
      email,
      name,
  })
};

const logout = async (req, res) => {
  const {_id} = req.user;
  await User.findByIdAndUpdate(_id, {token: ""});

  res.json({
      message: "Logout success"
  })                                
};

const updateAvatar = async(req, res) => {
  const {_id} = req.user;
  const {path: tempUpload, originalname} = req.file;
  const filename = `${_id}_${originalname}`;
  const resultUpload = path.join(avatarsDir, filename);
  await fs.rename(tempUpload, resultUpload);
  const avatarURL = path.join("avatars", filename);
  await User.findByIdAndUpdate(_id, {avatarURL});

  res.json({
      avatarURL,
  })
};

module.exports = {
  register: ctrlWrapper(register),
  login: ctrlWrapper(login),
  getCurrent: ctrlWrapper(getCurrent),
  logout: ctrlWrapper(logout),
  updateAvatar: ctrlWrapper(updateAvatar),
};