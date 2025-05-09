const express = require('express');
const multer = require("multer");
const mongoose = require('mongoose');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { GridFSBucket } = require('mongodb');
const Student = require("../../models/studentModel"); 
const Teacher = require("../../models/teacheraccont");
const Admin = require("../../models/useradmin");

