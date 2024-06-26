const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
const cors = require("cors");
const jwt = require('jsonwebtoken');
const SSLCommerzPayment = require('sslcommerz-lts')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { format } = require('date-fns');
require('dotenv').config()
// middleware
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('Hello BDU CLUB MASTER!')
})

const store_id = process.env.SSL_STORE_ID
const store_passwd = process.env.SSL_STORE_PASSWORD
const is_live = false

// mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.cwvxmja.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
/* const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
}); */

// jwt middleware
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.send({ message: "Unauthorized user" })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.send({ message: "Access forbidden" })
        }
        req.decoded = decoded
        next()
    })
}

async function run() {
    try {

        const registeredStd = client.db("BduClubMaster").collection("RegisteredStdCollections");
        const emailCollections = client.db("BduClubMaster").collection("IdEmailCollections");
        const newsEventsCollection = client.db("BduClubMaster").collection("NewsEventsCollection");
        const clubRegisterInfo = client.db("BduClubMaster").collection("ClubRegisterInfo");
        const allClubStdRegisterColl = client.db("BduClubMaster").collection("AllClubStdRegisterColl");
        const eventRegisterInfos = client.db("BduClubMaster").collection("EventRegisterInfos");
        const allEventsStdRegColl = client.db("BduClubMaster").collection("AllEventsStdRegColl");
        const youtubeContentColl = client.db("BduClubMaster").collection("YoutubeContent");
        const discountCollection = client.db("BduClubMaster").collection("DiscountsCollection");
        const guidanceCollection = client.db("BduClubMaster").collection("GuidanceCollection");
        const noticeCollection = client.db("BduClubMaster").collection("NoticeCollection");
        const budgetCollection = client.db("BduClubMaster").collection("BudgetCollection");
        const executiveMembers = client.db("BduClubMaster").collection("ExecutiveMembers");
        const kpiCollections = client.db("BduClubMaster").collection("kpiCollections");


        // insert std register info to database
        app.post('/registeredStds', async (req, res) => {

            const userInfo = req.body;
            const stdEmail = userInfo?.stdEmail;
            const stdId = userInfo?.uid
            const query = {
                stdEmail: stdEmail,
                uid: stdId
            }
            const user = await registeredStd.findOne(query)
            // console.log(user)
            if (!user) {
                const result = await registeredStd.insertOne(userInfo);
                return res.send(result)
            }
            res.send({ insertError: true })

        })
        // jwt setup when user login and register
        app.get('/jwt', async (req, res) => {
            const email = req.query.email

            const query = {
                stdEmail: email
            }
            const isRegistered = await registeredStd.findOne(query);

            if (isRegistered) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
                    expiresIn: '365d'
                })
                return res.send({ accessToken: token })
            }
            res.send({ accessToken: '' })
        })
        // emailById 
        app.get("/emailById", async (req, res) => {
            const stdId = req.query.id
            const query = {
                id: stdId
            }
            const result = await emailCollections.findOne(query);
            res.send(result)
        })
        // get student info by email
        app.get("/stdInfoByEmail", async (req, res) => {
            const email = req.query.email
            const query = {
                stdEmail: email
            }
            const result = await registeredStd.findOne(query);
            res.send(result)
        })
        // verifySuperAdmin 
        const verifySuperAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email
            const query = {
                stdEmail: decodedEmail
            }
            const user = await registeredStd.findOne(query)
            if (user?.role !== "superAdmin") {
                return res.send({ message: "Access forbidden" })
            }
            next()
        }
        // verifyClubAdmin
        const verifyClubAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email
            const query = {
                stdEmail: decodedEmail
            }
            const user = await registeredStd.findOne(query)
            if (user?.role !== "admin") {
                return res.send({ message: "Access forbidden" })
            }
            next()
        }
        // verify advisor
        const verifyAdvisor = async (req, res, next) => {
            const decodedEmail = req.decoded.email
            const query = {
                stdEmail: decodedEmail
            }
            const user = await registeredStd.findOne(query)
            if (user?.role !== "advisor") {
                return res.send({ message: "Access forbidden" })
            }
            next()
        }
        // get status from user
        app.get('/users/status', async (req, res) => {
            const email = req.query.email
            const query = {
                stdEmail: email
            }
            const user = await registeredStd.findOne(query)
            res.send({ role: user?.role })
            // console.log(user?.role)

        })
        // get latest news and events
        /*  app.get('/latest_news_events', async (req, res) => {
             const date = req.query.date
             const currentDate = new Date(); // Get the current date
             const formateDate = format(currentDate, 'PP');
             // console.log(formateDate)
             if (date === formateDate) {
                 const query = { eventDate: { $gte: formateDate } };
                 const result = await newsEventsCollection.find(query).sort({ eventDate: 1 }).toArray()
                 return res.send(result)
             }
             else {
                 const query = { eventDate: date };
                 const result = await newsEventsCollection.find(query).sort({ eventDate: 1 }).toArray()
                 return res.send(result)
             }
 
         }) */
        app.get('/latest_news_events', async (req, res) => {
            const dateNum = req.query.dateNum
            const currentDate = new Date(); // Get the current date
            // const formateDate = format(currentDate, 'PP');
            const currentDateNum = currentDate.toLocaleDateString();
            // console.log(dateNum)
            if (dateNum === currentDateNum) {
                const query =
                {
                    advisorApproval: "approved",
                    eventDateNum: { $gte: dateNum }
                };
                const result = await eventRegisterInfos.find(query).sort({ eventDateNum: 1 }).toArray()
                return res.send(result)
            }
            else {
                const query = {
                    advisorApproval: "approved",
                    eventDateNum: dateNum
                };
                const result = await eventRegisterInfos.find(query).sort({ eventDateNum: 1 }).toArray()
                return res.send(result)
            }

        })

        /* 
                // get clubAdmin
                app.get('/users/clubAdmin', async (req, res) => {
                    const email = req.query.email
                    const query = {
                        stdEmail: email
                    }
                    const user = await registeredStd.findOne(query)
                    res.send({ isClubAdmin: user?.role })
                    // console.log(user)
                })
                //get verify registeredUser
                app.get('/users/student', async (req, res) => {
                    const email = req.query.email
                    const query = {
                        stdEmail: email
                    }
                    const user = await registeredStd.findOne(query)
                    res.send({ isStudent: user?.role === "student" })
                    // console.log(user)
                }) */


        //******* */ student panel section ******


        // get clubRegister info by emai
        app.get("/clubRegisterInfo", verifyJWT, async (req, res) => {
            const query = {}
            const result = await clubRegisterInfo.find(query).toArray();
            res.send(result)
        })
        // get single student info
        app.get('/studentInfo', verifyJWT, async (req, res) => {
            const email = req.query.email
            const query = {
                stdEmail: email
            }
            const result = await registeredStd.findOne(query)
            res.send(result)
            // console.log(user?.role)

        })
        // event registration
        app.post("/std_event_registration_info", verifyJWT, async (req, res) => {
            const data = req.body
            // console.log(stdClubRegisterInfo)
            const stdEmail = data?.stdEmail;
            const eventId = data?.eventId;
            const eventClubName = data?.eventClubName;

            const existQuery = {
                stdEmail: stdEmail,
                eventId: eventId,
                eventClubName: eventClubName
            }
            const findingResult = await allEventsStdRegColl.findOne(existQuery)
            if (!findingResult) {
                const result = await allEventsStdRegColl.insertOne(data)
                return res.send(result)
            }
            if (findingResult) {
                return res.send({ acknowledged: false })
            }

        })
        // ssl commerz integration

        app.post('/std_club_registration_info', verifyJWT, async (req, res) => {
            const stdClubRegisterInfo = req.body
            // console.log(stdClubRegisterInfo)
            const stdEmail = stdClubRegisterInfo?.stdEmail;
            const clubName = stdClubRegisterInfo?.clubName;

            const existQuery = {
                stdEmail: stdEmail,
                clubName: clubName
            }
            const findingResult = await allClubStdRegisterColl.findOne(existQuery)
            if (findingResult) {
                return res.send({ message: 'You are already registered to this club' })

            }
            if (stdClubRegisterInfo?.registerFee === 0) {
                const noFeeResult = await allClubStdRegisterColl.insertOne({
                    ...stdClubRegisterInfo,
                    transactionId: "",
                    paid: "free"
                })
                return res.send(noFeeResult)
            }

            const transactionId = new ObjectId().toString()
            const data = {
                total_amount: stdClubRegisterInfo?.registerFee,
                currency: 'BDT',
                tran_id: transactionId, // use unique tran_id for each api call
                success_url: `http://localhost:5000/success_payment?transactionId=${transactionId}`,
                fail_url: `http://localhost:5000/fail_payment?transactionId=${transactionId}`,
                cancel_url: `http://localhost:5000/fail_payment?transactionId=${transactionId}`,
                ipn_url: `http://localhost:3000/fail_payment?transactionId=${transactionId}`,
                shipping_method: 'Club Payment',
                product_name: stdClubRegisterInfo?.clubName,
                product_category: "no",
                product_profile: 'general',
                cus_name: stdClubRegisterInfo?.stdName,
                cus_email: stdClubRegisterInfo?.stdEmail,
                cus_add1: "no",
                cus_add2: "no",
                cus_city: "no",
                cus_state: "no",
                cus_postcode: "no",
                cus_country: 'Bangladesh',
                cus_phone: stdClubRegisterInfo?.stdPhone,
                cus_fax: "no",
                ship_name: "no",
                ship_add1: "no",
                ship_add2: "no",
                ship_city: "no",
                ship_state: "no",
                ship_postcode: "no",
                ship_country: 'Bangladesh',
            };
            // console.log(data)
            const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
            sslcz.init(data).then(apiResponse => {
                // Redirect the user to payment gateway
                let GatewayPageURL = apiResponse.GatewayPageURL

                res.send({ url: GatewayPageURL })
                // console.log(apiResponse)
                // console.log('Redirecting to: ', GatewayPageURL)
                allClubStdRegisterColl.insertOne({
                    ...stdClubRegisterInfo,
                    transactionId,
                    paid: "false"
                })
            });

        })
        // if success ssl get url request from server 
        app.post('/success_payment', async (req, res) => {
            const transactionId = req.query.transactionId
            if (!transactionId) {
                return res.redirect("http://localhost:3000/fail_payment")
            }
            // update paid status when payment success
            const paidFilter = {
                transactionId: transactionId
            }
            const paidUpdated = {
                $set: {
                    paid: "true"

                }
            }
            const paidResult = await allClubStdRegisterColl.updateOne(paidFilter, paidUpdated)
            if (paidResult.modifiedCount > 0) {
                res.redirect(`http://localhost:3000/success_payment?transactionId=${transactionId}`)
            }
        })
        app.post('/fail_payment', async (req, res) => {
            const transactionId = req.query.transactionId
            if (!transactionId) {
                return res.redirect("http://localhost:3000/fail_payment")
            }
            const query = {
                transactionId: transactionId
            }
            const result = await allClubStdRegisterColl.deleteOne(query)
            if (result.deletedCount === 1) {
                return res.redirect("http://localhost:3000/fail_payment")
            }
        })
        // get data by transaction id
        app.get('/getDataTrans', verifyJWT, async (req, res) => {
            const transactionId = req.query.transactionId
            const query = {
                transactionId: transactionId
            }
            const result = await allClubStdRegisterColl.findOne(query)
            res.send(result)
        })
        // get club register info by gmail ...discover
        app.get('/clubRegisterInfoByGmail', verifyJWT, async (req, res) => {
            const stdEmail = req.query.email
            const query = {
                stdEmail: stdEmail
            }
            const result = await allClubStdRegisterColl.find(query).toArray()
            res.send(result)
        })
        // get all event register info 
        app.get('/allEventsForReg', verifyJWT, async (req, res) => {
            const clubNames = JSON.parse(req.query.clubNames);
            const filterText = req.query.filterText;
            if (!filterText) {
                const query = {
                    advisorApproval: "approved",
                    clubName: { $in: clubNames }
                };
                const result = await eventRegisterInfos.find(query).sort({ eventDateNum: -1 }).toArray()
                return res.send(result)
            }
            else {
                const query = {
                    advisorApproval: "approved",
                    clubName: filterText
                }
                const result = await eventRegisterInfos.find(query).sort({ eventDateNum: -1 }).toArray()
                return res.send(result)
            }

        })
        // get youtube content by clubnames
        app.get('/contentDataByClub', verifyJWT, async (req, res) => {
            const clubNames = JSON.parse(req.query.clubNames);
            const contentType = req.query.contentType;
            const searchText = req.query.searchText;
            // console.log(searchText)
            if (searchText) {
                const query = {
                    clubName: { $in: clubNames },
                    $text: {
                        $search: searchText
                    }
                };
                const result = await youtubeContentColl.find(query).sort({ publishedDateNum: -1 }).toArray();

                return res.send(result);
            }
            else {
                if (contentType === "all") {
                    const query = {
                        clubName: { $in: clubNames }
                    };
                    const result = await youtubeContentColl.find(query).sort({ publishedDateNum: -1 }).toArray();

                    return res.send(result);
                }
                if (contentType === "recommended") {
                    const query = {
                        popularContent: "yes",
                        clubName: { $in: clubNames }
                    };
                    const result = await youtubeContentColl.find(query).sort({ publishedDateNum: -1 }).toArray();
                    return res.send(result);
                }
            }
        });
        // discountData
        app.get('/discountDataByClub', verifyJWT, async (req, res) => {
            const clubNames = JSON.parse(req.query.clubNames);
            const discountType = req.query.discountType;
            const searchText = req.query.searchText;
            // console.log(searchText)
            if (searchText) {
                const query = {
                    clubName: { $in: clubNames },
                    $text: {
                        $search: searchText
                    }
                };
                const result = await discountCollection.find(query).sort({ publishedDateNum: -1 }).toArray();

                return res.send(result);
            }
            else {
                if (discountType === "all") {
                    const query = {
                        clubName: { $in: clubNames }
                    };
                    const result = await discountCollection.find(query).sort({ publishedDateNum: -1 }).toArray();

                    return res.send(result);
                }
                if (discountType === "recommended") {
                    const query = {
                        recommend: "yes",
                        clubName: { $in: clubNames }
                    };
                    const result = await discountCollection.find(query).sort({ publishedDateNum: -1 }).toArray();
                    return res.send(result);
                }
            }
        });
        // event info by gmail
        app.get('/eventRegisterInfoByGmail', verifyJWT, async (req, res) => {
            const stdEmail = req.query.email
            const query = {
                stdEmail: stdEmail
            }
            const result = await allEventsStdRegColl.find(query).sort({ publishedDateNum: -1 }).toArray()
            res.send(result)
        })
        // event id by info
        app.get('/eventInfoById/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            // console.log(id)
            const query = {
                _id: new ObjectId(id)
            }
            const result = await allEventsStdRegColl.findOne(query)
            res.send(result)
        })
        // insert guidance
        app.post('/guidance', verifyJWT, async (req, res) => {
            const data = req.body
            const result = await guidanceCollection.insertOne(data)
            res.send(result)
        })
        // get guidance
        app.get('/getGuidance', verifyJWT, async (req, res) => {
            const stdEmail = req.query.email
            const query = {
                stdEmail: stdEmail
            }
            const result = await guidanceCollection.find(query).sort({ requestDateNum: -1 }).toArray()
            res.send(result)
        })
        // delete guidance
        app.delete('/deleteGuidance', verifyJWT, async (req, res) => {
            const id = req.query.id
            const query = {
                _id: new ObjectId(id)
            }
            const result = await guidanceCollection.deleteOne(query)
            res.send(result)
        })
        // notice data by club
        app.get('/noticeDataByClub', verifyJWT, async (req, res) => {
            const clubNames = JSON.parse(req.query.clubNames);
            const clickText = req.query.clickText

            if (!clickText) {
                const query = {
                    clubName: { $in: clubNames }
                };
                const result = await noticeCollection.find(query).sort({ noticeDateNum: -1 }).toArray()
                return res.send(result)
            }
            else {
                const query = {
                    clubName: clickText,

                };
                const result = await noticeCollection.find(query).sort({ noticeDateNum: -1 }).toArray()
                return res.send(result)
            }

        })
        //******* */ admin section ******

        // get club members length
        app.get('/club_reg_std_data_len', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName
            const query = {
                clubName: clubName
            }
            const result = await allClubStdRegisterColl.find(query).toArray()
            res.send(result)
        })
        app.get('/club_reg_std_data', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName
            const searchId = req.query.searchId
            if (searchId) {
                const query = {
                    uid: searchId,
                    clubName: clubName
                }
                const result = await allClubStdRegisterColl.find(query).toArray()
                return res.send(result)
            }
            else {
                const query = {
                    clubName: clubName
                }
                const result = await allClubStdRegisterColl.find(query).toArray()
                res.send(result)
            }
        })
        // club reg delete
        app.delete('/club_reg_std_delete', verifyJWT, verifyClubAdmin, async (req, res) => {
            const id = req.query.id
            const query = {
                _id: new ObjectId(id)
            }
            const result = await allClubStdRegisterColl.deleteOne(query)
            res.send(result)
        })
        // add club info
        app.post('/add_club_info', verifyJWT, verifyClubAdmin, async (req, res) => {
            const data = req.body
            const query = {
                clubName: data?.clubName
            }
            const existClub = await clubRegisterInfo.findOne(query)
            if (!existClub) {
                const result = await clubRegisterInfo.insertOne(data)
                return res.send(result)
            }
            else {
                return res.send({ acknowledged: false })
            }

        })
        // get club info club_info_by_club_name
        app.get('/clubInfoByClubName', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName
            const query = {
                clubName: clubName
            }
            const result = await clubRegisterInfo.find(query).toArray()
            res.send(result)
        })
        // edit club Info
        app.put("/editClubInfo", verifyJWT, verifyClubAdmin, async (req, res) => {
            const editInfo = req.body
            const filter = {
                clubName: editInfo?.clubName
            }
            const dataUpdated = {
                $set: {
                    image: editInfo?.image,
                    fee: editInfo?.fee,
                    totalMembers: editInfo?.totalMembers,
                    endDate: editInfo?.endDate,
                    endDateNum: editInfo?.endDateNum

                }
            }
            const result1 = await clubRegisterInfo.updateOne(filter, dataUpdated)
            res.send(result1)

        })
        // delete club info
        app.delete('/deleteClubInfo', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName
            const query = {
                clubName: clubName
            }
            const result = await clubRegisterInfo.deleteOne(query)
            res.send(result)
        })
        // eventInfoByClub
        app.get('/eventInfoByClub', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName
            const query = {
                clubName: clubName
            }
            const result = await eventRegisterInfos.find(query).sort({ eventId: -1 }).toArray()
            res.send(result)
        })
        // add event info 
        app.post('/add_event_info', verifyJWT, verifyClubAdmin, async (req, res) => {
            const data = req.body
            const query = {
                eventId: data?.eventId,
                clubName: data?.clubName
            }
            const existClub = await eventRegisterInfos.findOne(query)
            if (!existClub) {
                const result = await eventRegisterInfos.insertOne(data)
                return res.send(result)
            }
            else {
                return res.send({ acknowledged: false })
            }

        })
        // deleteEventInfo
        app.delete('/deleteEventInfo', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName
            const eventId = parseInt(req.query.eventId)
            // console.log(clubName, eventId)
            const query1 = {
                eventId: eventId,
                eventClubName: clubName
            }
            const result1 = await allEventsStdRegColl.deleteMany(query1)
            const query2 = {
                eventId: eventId,
                clubName: clubName
            }
            const result2 = await eventRegisterInfos.deleteOne(query2)
            res.json({ result1, result2 })
            // res.send(result2)
        })
        // edit event Info
        app.put("/editEventInfo", verifyJWT, verifyClubAdmin, async (req, res) => {
            const editInfo = req.body
            const filterStd = {
                eventId: editInfo?.eventId,
                eventClubName: editInfo?.clubName
            }
            const dataUpdatedStd = {
                $set: {
                    eventHeadline: editInfo?.headline,
                    sortHeadline: editInfo?.sortHeadline,
                    eventDetails: editInfo?.eventDetails,
                    // eventBanner: editInfo?.eventBanner,
                    clubLogo: editInfo?.clubLogo,
                    eventTime: editInfo?.eventTime,
                    companyName: editInfo?.companyName,
                    isCertificate: editInfo?.isCertificate,
                    certificateType: editInfo?.certificateType,
                    companyLogo: editInfo?.companyLogo,
                    presidentName: editInfo?.presidentName,
                    presidentSign: editInfo?.presidentSign,
                    gsName: editInfo?.gsName,
                    gsSign: editInfo?.gsSign,
                    eventDate: editInfo?.editEventDate,
                    // eventDateNum: editInfo?.editEventDateNum,
                    eventRegEndDate: editInfo?.editEventDateline,
                    // regEndDateNum: editInfo?.editEventDatelineNum,
                    venue: editInfo?.venue,
                }
            }
            const result2 = await allEventsStdRegColl.updateOne(filterStd, dataUpdatedStd)
            const filter = {
                _id: new ObjectId(editInfo?.mongodbId)
            }
            const dataUpdated = {
                $set: {
                    headline: editInfo?.headline,
                    sortHeadline: editInfo?.sortHeadline,
                    eventDetails: editInfo?.eventDetails,
                    eventBanner: editInfo?.eventBanner,
                    clubLogo: editInfo?.clubLogo,
                    eventTime: editInfo?.eventTime,
                    companyName: editInfo?.companyName,
                    isCertificate: editInfo?.isCertificate, certificateType: editInfo?.certificateType,
                    companyLogo: editInfo?.companyLogo,
                    presidentName: editInfo?.presidentName,
                    presidentSign: editInfo?.presidentSign,
                    gsName: editInfo?.gsName,
                    gsSign: editInfo?.gsSign,
                    eventDate: editInfo?.editEventDate,
                    eventDateNum: editInfo?.editEventDateNum,
                    regEndDate: editInfo?.editEventDateline,
                    regEndDateNum: editInfo?.editEventDatelineNum,
                    venue: editInfo?.venue,
                }
            }
            const result1 = await eventRegisterInfos.updateOne(filter, dataUpdated)
            res.send(result1)

        })
        // get all events register collection eventRegInfoByClub
        app.get('/eventRegInfoByClub', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName;
            const searchId = req.query.eventId;
            if (searchId) {
                const eventId = parseInt(searchId);
                const query = {
                    eventId: eventId,
                    eventClubName: clubName
                }
                const result = await allEventsStdRegColl.find(query).sort({ eventId: -1 }).toArray()
                return res.send(result)
            }
            else {
                const query = {
                    eventClubName: clubName
                }
                const result = await allEventsStdRegColl.find(query).sort({ eventId: -1 }).toArray()
                return res.send(result)
            }
        })
        // updateCertificateStatus
        app.put("/updateCertificateStatus", verifyJWT, verifyClubAdmin, async (req, res) => {
            const editInfo = req.body

            const filter = {
                _id: new ObjectId(editInfo?.mongodbId)
            }
            const dataUpdated = {
                $set: {
                    status: editInfo?.certificateStatus
                }
            }
            const result1 = await allEventsStdRegColl.updateOne(filter, dataUpdated)
            res.send(result1)

        })
        // get notice by club
        app.get('/getNoticeByClub', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName;
            const searchId = req.query.noticeId;
            if (searchId) {
                const noticeId = parseInt(searchId);
                const query = {
                    noticeId: noticeId,
                    clubName: clubName
                }
                const result = await noticeCollection.find(query).sort({ noticeId: -1 }).toArray()
                return res.send(result)
            }
            else {
                const query = {
                    clubName: clubName
                }
                const result = await noticeCollection.find(query).sort({ noticeId: -1 }).toArray()
                return res.send(result)
            }
        })

        // add notice data noticeId add_notice_data
        app.post('/add_notice_data', verifyJWT, verifyClubAdmin, async (req, res) => {
            const data = req.body
            const query = {
                noticeId: data?.noticeId,
                clubName: data?.clubName
            }
            const existClub = await noticeCollection.findOne(query)
            if (!existClub) {
                const result = await noticeCollection.insertOne(data)
                return res.send(result)
            }
            else {
                return res.send({ acknowledged: false })
            }

        })
        // deleteNoticeInfo
        app.delete('/deleteNoticeInfo', verifyJWT, verifyClubAdmin, async (req, res) => {
            const id = req.query.id
            const query = {
                _id: new ObjectId(id)
            }
            const result = await noticeCollection.deleteOne(query)
            res.send(result)
        })
        // editNoticeData
        app.put("/editNoticeData", verifyJWT, verifyClubAdmin, async (req, res) => {
            const editInfo = req.body

            const filter = {
                _id: new ObjectId(editInfo?.mongodbNoticeId)
            }
            const dataUpdated = {
                $set: {
                    clubLogo: editInfo?.clubLogo,
                    noticeDetails: editInfo?.noticeDetails,
                    headline: editInfo?.headline,
                    // noticeId: editInfo?.noticeId,
                }
            }
            const result1 = await noticeCollection.updateOne(filter, dataUpdated)
            res.send(result1)

        })
        // library
        // get youtube content
        app.get('/contentDataByAdmin', verifyJWT, verifyClubAdmin, async (req, res) => {

            const clubName = req.query.clubName;
            const searchText = req.query.searchText;
            // console.log(searchText)
            if (searchText) {
                const query = {
                    clubName: clubName,
                    $text: {
                        $search: searchText
                    }
                };
                const result = await youtubeContentColl.find(query).sort({ libraryId: -1 }).toArray();
                return res.send(result);
            }
            else {

                const query = {
                    clubName: clubName,
                };
                const result = await youtubeContentColl.find(query).sort({ libraryId: -1 }).toArray();
                return res.send(result);


            }
        });
        // add_library_data
        app.post('/add_library_data', verifyJWT, verifyClubAdmin, async (req, res) => {
            const data = req.body
            const query = {
                libraryId: data?.libraryId,
                clubName: data?.clubName
            }
            const existClub = await youtubeContentColl.findOne(query)
            if (!existClub) {
                const result = await youtubeContentColl.insertOne(data)
                return res.send(result)
            }
            else {
                return res.send({ acknowledged: false })
            }

        })
        // editLibraryData
        app.put("/editLibraryData", verifyJWT, verifyClubAdmin, async (req, res) => {
            const editInfo = req.body

            const filter = {
                _id: new ObjectId(editInfo?.mongodbId)
            }
            const dataUpdated = {
                $set: {
                    // libraryId: editInfo?.libraryId,
                    title: editInfo?.title,
                    description: editInfo?.description,
                    videoLink: editInfo?.videoLink,
                    exploreLink: editInfo?.exploreLink,
                    popularContent: editInfo?.popularContent,
                }
            }
            const result1 = await youtubeContentColl.updateOne(filter, dataUpdated)
            res.send(result1)

        })
        // deleteLibraryInfo
        app.delete('/deleteLibraryInfo', verifyJWT, verifyClubAdmin, async (req, res) => {
            const id = req.query.id
            const query = {
                _id: new ObjectId(id)
            }
            const result = await youtubeContentColl.deleteOne(query)
            res.send(result)
        })

        // rewards  rewardsDataByAdmin
        app.get('/rewardsDataByAdmin', verifyJWT, verifyClubAdmin, async (req, res) => {

            const clubName = req.query.clubName;
            const searchText = req.query.searchText;
            // console.log(searchText)
            if (searchText) {
                const query = {
                    clubName: clubName,
                    $text: {
                        $search: searchText
                    }
                };
                const result = await discountCollection.find(query).sort({ rewardId: -1 }).toArray();
                return res.send(result);
            }
            else {

                const query = {
                    clubName: clubName,
                };
                const result = await discountCollection.find(query).sort({ rewardId: -1 }).toArray();
                return res.send(result);


            }
        });
        // add_rewards_data
        app.post('/add_rewards_data', verifyJWT, verifyClubAdmin, async (req, res) => {
            const data = req.body
            const query = {
                rewardId: data?.rewardId,
                clubName: data?.clubName
            }
            const existClub = await discountCollection.findOne(query)
            if (!existClub) {
                const result = await discountCollection.insertOne(data)
                return res.send(result)
            }
            else {
                return res.send({ acknowledged: false })
            }

        })
        // editRewardData
        app.put("/editRewardData", verifyJWT, verifyClubAdmin, async (req, res) => {
            const editInfo = req.body

            const filter = {
                _id: new ObjectId(editInfo?.mongodbId)
            }
            const dataUpdated = {
                $set: {
                    // rewardId: editInfo?.rewardId,
                    courseName: editInfo?.courseName,
                    courseLink: editInfo?.courseLink,
                    companyName: editInfo?.companyName,
                    contact: editInfo?.contact,
                    promoCode: editInfo?.promoCode,
                    recommend: editInfo?.recommend,
                    courseImg: editInfo?.courseImg,
                    courseFee: editInfo?.courseFee,
                    discountCourseFee: editInfo?.discountCourseFee,
                }
            }
            const result1 = await discountCollection.updateOne(filter, dataUpdated)
            res.send(result1)

        })
        // deleteRewardInfo
        app.delete('/deleteRewardInfo', verifyJWT, verifyClubAdmin, async (req, res) => {
            const id = req.query.id
            const query = {
                _id: new ObjectId(id)
            }
            const result = await discountCollection.deleteOne(query)
            res.send(result)
        })
        // guidanceDataByAdmin
        app.get('/guidanceDataByAdmin', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName;
            const searchType = req.query.searchType;
            const searchReply = req.query.searchReply;

            // console.log(searchText)
            if (searchType && searchReply) {
                if (searchReply === "no") {
                    if (searchType === "all") {
                        const query = {
                            clubName: clubName,
                            // type: searchType,
                            reply: searchReply
                        };
                        const result = await guidanceCollection.find(query).sort({ requestDateNum: -1 }).toArray();
                        return res.send(result);
                    }
                    else {
                        const query = {
                            clubName: clubName,
                            type: searchType,
                            reply: searchReply
                        };
                        const result = await guidanceCollection.find(query).sort({ requestDateNum: -1 }).toArray();
                        return res.send(result);
                    }
                }
                else {
                    if (searchType === "all") {
                        const query = {
                            clubName: clubName,
                            // type: searchType,
                            reply: { $ne: "no" }
                        };
                        const result = await guidanceCollection.find(query).sort({ requestDateNum: -1 }).toArray();
                        return res.send(result);
                    }
                    else {
                        const query = {
                            clubName: clubName,
                            type: searchType,
                            reply: { $ne: "no" }
                        };
                        const result = await guidanceCollection.find(query).sort({ requestDateNum: -1 }).toArray();
                        return res.send(result);
                    }

                }

            }
            else {
                const query = {
                    clubName: clubName,
                };
                const result = await guidanceCollection.find(query).sort({ requestDateNum: -1 }).toArray();
                return res.send(result);


            }
        });
        // editGuidanceReply
        app.put("/editGuidanceReply", verifyJWT, verifyClubAdmin, async (req, res) => {
            const editInfo = req.body

            const filter = {
                _id: new ObjectId(editInfo?.mongodbId)
            }
            const dataUpdated = {
                $set: {
                    reply: editInfo?.reply
                }
            }
            const result1 = await guidanceCollection.updateOne(filter, dataUpdated)
            res.send(result1)

        })
        // eventInfoById
        app.get('/eventInfoById', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName
            const eventId = parseInt(req.query.eventId)
            const query = {
                clubName: clubName,
                eventId: eventId,
                advisorApproval: "approved"
            }
            const result = await eventRegisterInfos.findOne(query)
            res.json(result)
            // res.send(result)

        })
        // add_budget_data
        app.post('/add_budget_data', verifyJWT, verifyClubAdmin, async (req, res) => {
            const data = req.body
            const query = {
                eventId: data?.eventId,
                clubName: data?.clubName
            }
            const existClub = await budgetCollection.findOne(query)
            if (!existClub) {
                const result = await budgetCollection.insertOne(data)
                return res.send(result)
            }
            else {
                return res.send({ acknowledged: false })
            }


        })
        // budgetDataByAdmin
        app.get('/budgetDataByAdmin', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName
            const query = {
                clubName: clubName

            }
            const result = await budgetCollection.find(query).toArray()
            res.send(result)
            // res.send(result)

        })
        // deleteBudgetInfo
        app.delete('/deleteBudgetInfo', verifyJWT, verifyClubAdmin, async (req, res) => {
            const id = req.query.id
            const query = {
                _id: new ObjectId(id)
            }
            const result = await budgetCollection.deleteOne(query)
            res.send(result)
        })
        // add_executive_member
        app.post('/add_executive_member', verifyJWT, verifyClubAdmin, async (req, res) => {
            const data = req.body
            const result = await executiveMembers.insertOne(data)
            return res.send(result)
        })
        // executiveDataByAdmin
        app.get('/executiveDataByAdmin', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName;
            const searchText = req.query.searchText;

            if (searchText) {
                const query = {
                    clubName: clubName,
                    $text: {
                        $search: searchText
                    }
                };
                const result = await executiveMembers.find(query).sort({ memberRank: 1 }).toArray();
                return res.send(result);
            }
            else {

                const query = {
                    clubName: clubName,
                };
                const result = await executiveMembers.find(query).sort({ memberRank: 1 }).toArray();
                return res.send(result);

            }
        });
        // deleteExecutiveInfo
        app.delete('/deleteExecutiveInfo', verifyJWT, verifyClubAdmin, async (req, res) => {
            const id = req.query.id
            const query = {
                _id: new ObjectId(id)
            }
            const result = await executiveMembers.deleteOne(query)
            res.send(result)
        })
        // editExecutiveData
        app.put("/editExecutiveData", verifyJWT, verifyClubAdmin, async (req, res) => {
            const editInfo = req.body

            const filter = {
                _id: new ObjectId(editInfo?.mongodbId)
            }
            const dataUpdated = {
                $set: {

                    memberName: editInfo?.memberName,
                    memberUid: editInfo?.memberUid,
                    memberDepartment: editInfo?.memberDepartment, memberSession: editInfo?.memberSession, memberEmail: editInfo?.memberEmail,
                    memberPhone: editInfo?.memberPhone,
                    designation: editInfo?.designation,
                    memberImage: editInfo?.memberImage,
                    fbLink: editInfo?.fbLink,
                    linkedinLink: editInfo?.linkedinLink,
                    memberRank: editInfo?.memberRank
                }
            }
            const result1 = await executiveMembers.updateOne(filter, dataUpdated)
            res.send(result1)

        })
        // executiveDataKpiInsert
        app.get('/executiveDataKpiInsert', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName;
            const searchText = req.query.searchText;
            const searchRank = parseInt(req.query.searchRank);

            if (searchText) {
                const query = {
                    clubName: clubName,
                    $text: {
                        $search: searchText
                    }
                };
                const result = await executiveMembers.find(query).sort({ memberRank: 1 }).toArray();
                return res.send(result);
            }
            else if (searchRank) {
                const query = {
                    clubName: clubName,
                    memberRank: { $gte: searchRank }
                };
                const result = await executiveMembers.find(query).sort({ memberRank: 1 }).toArray();
                return res.send(result);
            }
            else {

                const query = {
                    clubName: clubName,
                };
                const result = await executiveMembers.find(query).sort({ memberRank: 1 }).toArray();
                return res.send(result);

            }
        });
        // add_executive_member_kpi_result
        app.post('/add_executive_member_kpi_result', verifyJWT, verifyClubAdmin, async (req, res) => {
            const data = req.body
            const result = await kpiCollections.insertOne(data)
            return res.send(result)
        })
        // getAttendence&FieldScore
        app.get('/getAttendenceFieldScore', verifyJWT, verifyClubAdmin, async (req, res) => {
            const clubName = req.query.clubName
            const id = req.query.id

            const query = {
                clubName: clubName,
                memberMongodbId: id
            }
            const result = await kpiCollections.findOne(query)
            res.json(result)
            // res.send(result)

        })







        //........*****Advisor Panel**********......
        // eventInfoByAdvisor
        app.get('/eventInfoByAdvisor', verifyJWT, verifyAdvisor, async (req, res) => {
            const advisorApproval = req.query.advisorApproval
            if (advisorApproval) {
                const query = {
                    advisorApproval: advisorApproval
                }
                const result = await eventRegisterInfos.find(query).sort({ eventApplyDateNum: -1 }).toArray()
                return res.send(result)
            }
            else {
                const query = {

                }
                const result = await eventRegisterInfos.find(query).sort({ eventApplyDateNum: -1 }).toArray()
                return res.send(result)
            }

        })
        // update Advisor approval updateAdviosrApproval
        app.put("/updateAdviosrApproval", verifyJWT, verifyAdvisor, async (req, res) => {
            const editInfo = req.body

            const filter = {
                _id: new ObjectId(editInfo?.mongodbId)
            }
            const dataUpdated = {
                $set: {
                    advisorApproval: editInfo?.advisorApproval
                }
            }
            const result1 = await eventRegisterInfos.updateOne(filter, dataUpdated)
            res.send(result1)

        })
        app.get('/budgetDataByAdvisor', verifyJWT, verifyAdvisor, async (req, res) => {
            const clubName = req.query.clubName
            const replyStatus = req.query.replyStatus
            if (replyStatus === "no") {
                const query = {
                    clubName: clubName,
                    replyStatus: ""
                }
                const result = await budgetCollection.find(query).toArray()
                return res.send(result)
            }
            else if (replyStatus === "yes") {
                const query = {
                    clubName: clubName,
                    replyStatus: { $ne: "" }

                }
                const result = await budgetCollection.find(query).toArray()
                return res.send(result)
            }
            else {
                const query = {
                    clubName: clubName,


                }
                const result = await budgetCollection.find(query).toArray()
                return res.send(result)
            }

            // res.send(result)

        })
        // updateBugetReplyStatus
        app.put("/updateBugetReplyStatus", verifyJWT, verifyAdvisor, async (req, res) => {
            const editInfo = req.body

            const filter = {
                _id: new ObjectId(editInfo?.mongodbId)
            }
            const dataUpdated = {
                $set: {
                    replyStatus: editInfo?.replyStatus
                }
            }
            const result1 = await budgetCollection.updateOne(filter, dataUpdated)
            res.send(result1)

        })

    }
    finally {

    }
}
run().catch(console.log)


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})