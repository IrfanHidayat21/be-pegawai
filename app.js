const express = require('express');
const app = express();

const bodyParser = require('body-parser');

const jwt = require('jsonwebtoken');

const dotenv = require('dotenv')
dotenv.config({path:__dirname+'/.env'});

const mongoose = require('mongoose');
/* MIDDLEWARE  */

// Load in mongoose models
const { Pegawai, User } = require('./db/models');

// Load middlware
app.use(bodyParser.json());


// CORS HEADER MIDDLEWARE
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");

    res.header (
        "Access-Control-Expose-Headers",
        "x-access-token, x-refresh-token"
    );
    
    next();
  });


// check whether the request has a valid JWT access token
let authenticate = (req, res, next) => {
    let token = req.header('x-access-token');

    // verify the JWT
    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if (err) {
            // there was an error
            // jwt is invalid - * DO NOT AUTHENTICATE *
            res.status(401).send(err);
        } else {
            // jwt is valid
            req.user_id = decoded._id;
            next();
        }
    });
}

// Verify Refresh Token Middleware (which will be verifying the session)
let verifySession = (req, res, next) => {
    // grab the refresh token from the request header
    let refreshToken = req.header('x-refresh-token');

    // grab the _id from the request header
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user) {
            // user couldn't be found
            return Promise.reject({
                'error': 'User not found. Make sure that the refresh token and user id are correct'
            });
        }


        // if the code reaches here - the user was found
        // therefore the refresh token exists in the database - but we still have to check if it has expired or not

        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                // check if the session has expired
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    // refresh token has not expired
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            // the session is VALID - call next() to continue with processing this web request
            next();
        } else {
            // the session is not valid
            return Promise.reject({
                'error': 'Refresh token has expired or the session is invalid'
            })
        }

    }).catch((e) => {
        res.status(401).send(e);
    })
}

/* END MIDDLEWARE  */

// ROUTE HANDLERS


// LIST ROUTES

// GET /list
// Purpose: Get all lists
app.get('/pegawai', (req, res) => {
    // we want to return an array of all the lists in the database
    Pegawai.find({
        _userId: req.user_id
    }).then((lists) => {
    res.send(lists);
    })
    .catch((err) => {
    console.log(err);
    })
    
});

// GET /pegawai/:listId
// Purpose: Get list by id
app.get('/pegawai/:id', (req, res) => {
    // We want to return one list by id
    Pegawai.findOne({
        _id: req.params.id, 
        _userId: req.user_id 
    }).then((lists) => {
        res.send(lists);
    })
});


// POST /list
// Purpose: Create a list
app.post('/pegawai', (req, res) => {
    // We want to create a new list and return the new list document back to the user (which includes the id)
    // The list information (fields) will be passed in via the JSON request body
    console.log(req)
    let nama = req.body.nama;
    let nomor_identitas = req.body.nomor_identitas;
    let alamat = req.body.alamat;
    let nomor_telepon = req.body.nomor_telepon;
    let tanggal_lahir = req.body.tanggal_lahir;
    let jenis_kelamin = req.body.jenis_kelamin;
    let pendidikan = req.body.pendidikan;
    let jabatan = req.body.jabatan;
    let gaji = req.body.gaji;
    let tanggal_masuk = req.body.tanggal_masuk;
    let status_pekerjaan = req.body.status_pekerjaan;
    let nomor_rekening_bank = req.body.nomor_rekening_bank;

    let newList = new Pegawai ({
        nama,
        nomor_identitas,
        alamat,
        nomor_telepon,
        tanggal_lahir,
        jenis_kelamin,
        pendidikan,
        jabatan,
        gaji,
        tanggal_masuk,
        status_pekerjaan,
        nomor_rekening_bank
    });
    newList.save().then((listDoc) => {
        // the full list document is returned (incl. id)
        res.send(listDoc);
    })
});

// PATCH /list/:id
// Purpose: Update a specified list
app.patch('/pegawai/:id', (req, res) => {
    // We want to update the specified list (list document with id in the URL) with the new values specified in the JSON body of the request
    Pegawai.findOneAndUpdate({ _id: req.params.id, _userId: req.user_id }, {
        $set: req.body
    }).then(() => {
        res.send({ 'message': 'updated successfully'});
    });
});

// DELETE /list/:id
// Purpose: Delete a list
app.delete('/pegawai/:id', (req, res) => {
    // We want to delete the specified list (document with id in the URL)
    
    Pegawai.findOneAndRemove({
        _id: req.params.id
    }).then((removedListDoc) => {
        res.send(removedListDoc);
    })
});

/* USER ROUTES */

/**
 * POST /users
 * Purpose: Sign up
 */
 app.post('/users', (req, res) => {
    // User sign up

    let body = req.body;
    let newUser = new User(body);

    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        // Session created successfully - refreshToken returned.
        // now we geneate an access auth token for the user

        return newUser.generateAccessAuthToken().then((accessToken) => {
            // access auth token generated successfully, now we return an object containing the auth tokens
            return { accessToken, refreshToken }
        });
    }).then((authTokens) => {
        // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    })
})


/**
 * POST /users/login
 * Purpose: Login
 */
app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            // Session created successfully - refreshToken returned.
            // now we geneate an access auth token for the user

            return user.generateAccessAuthToken().then((accessToken) => {
                // access auth token generated successfully, now we return an object containing the auth tokens
                return { accessToken, refreshToken }
            });
        }).then((authTokens) => {
            // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    });
})


/**
 * GET /users/me/access-token
 * Purpose: generates and returns an access token
 */
app.get('/users/me/access-token', verifySession, (req, res) => {
    // we know that the user/caller is authenticated and we have the user_id and user object available to us
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });
})

const port = process.env.PORT;
mongoose.connect(process.env.MONGODB_URL).then(() => {
    console.log("Mongodb connected");
    app.listen(port, () => {
      console.log(`Server is listening on port ${port}`);
    });
  }).catch((err) => {
    console.log({ err });
    process.exit(1);
  });