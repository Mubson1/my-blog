import express from 'express';
//This body-parser allows our server to extract the JSON data. First intall it using npm install --save body-parser
import bodyParser from 'body-parser';
//MongoClient will help us connect with our local database.
import {MongoClient} from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';

//We will not be needing these data as these data are already inserted into our mongodb. For explanation see notes
// //Now, we will create a fake database (i.e., json object) which will keep track of the upvotes for our articles. This upvotes define the popularity i.e., how often the article is read by the users.
// const articlesInfo = {
//     'learn-react': {
//         upvotes:0,
//         //Here, comments are made array type because in each index of array, comments from users will be stored
//         comments:[],
//     },
//     'learn-node': {
//         upvotes:0,
//         comments:[],
//     },
//     'my-thoughts-on-resumes':{
//         upvotes:0,
//         comments:[],
//     },
// }

//From this app object, we can define different end points for our app. End points are like 3000 of localhost:3000
const app = express();

//Explanation in notes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '/build')));

//This line should be above the routes. This line is parsing the JSON object that we've included along with our post request in the postman testing app.
//Rember, we are passing the json file along the app from the postman app. This data is like: {"name": "Mubson"}
//To add this json file in the app, Go to body, select raw and under text dropdown select json.Then finally write the file in the textarea
app.use(bodyParser.json());

//There are multiple codes being repeated in different gt and post routes below. So, for reducing the LOC, we are creating a function.
const withDB = async (operations,res) => {  //Here, operations is function and res is response as there might be error from catch block that would be sent as response by the server.
    try{
        //.connect() will accept the url of mongo database we want to connect to as the first argument. The second argument is done for just so.
        //The await operator is used to wait for a Promise. It can only be used inside an async function. 27017 is the default port of MongoDB
        //MongoClient.connect() will return a client object which will be used to send queries to the database
        const client = await MongoClient.connect('mongodb://localhost:27017', {useNewUrlParser: true});
        //we to access or query our my-blog database we are running, we will be doing following:
        const db = client.db('my-blog');

        //Other codes are same except this. The code below const db ad above client.close(). So, we are using the function itself as an argument to our main function (i.e., withDB)
        await operations(db);

        //remember to close the database
        client.close();
    }
    catch (error) {
        //500 is the status code for an internal server error. We are sending a JSON object with message property saying something went wrong and an error property which contains the error that occured
        res.status(500).json({ message: 'Error Connecting to db', error});
    }
}

//Creating a new route that will allow the user to simply get the associated information for an article.
//So, in this way when our front-end loads one of our article pages, it will be able to fetch the associated data from our back-end
app.get('/api/articles/:name', async (req,res) => { //Since, we have used await in the body of the function, we are adding async in the callback. This is just like doing:   async function function_name {...body...}
    //calling the above function    
    withDB(async (db) => {
            const articleName = req.params.name;
    
            //we are using await here because reading from the database is asynchronous.
            //We want to work with our 'articles' collection so, db.collection('<name of collectin>') and we are finding data of the article that matches the name from the url
            const articleInfo=await db.collection('articles').findOne({name: articleName});
            //.json is same as send. Since data is in json, .json is prefered. This will print the status of json file in the website.
            res.status(200).json(articleInfo);
        }, res);
})

//A route that will allow to keep track of the upvotes
//Here, our url will start with api because it will be easy it connect our backend and frontend. At last, we are using upvotes as this url will be showing our upvotes for the given article
app.post('/api/articles/:name/upvotes', async (req,res) => {

    withDB(async (db) => {
        const articleName = req.params.name;
   
        //creating a query that finds the matched data of the article that the user has entered
        const articleInfo = await db.collection('articles').findOne({name: articleName});

        //creating a query for increasing the no. of upvotes of the particular article
        await db.collection('articles').updateOne(
            //first argument of updateOne that finds which data to update.
            {name:articleName}, 
            //second argument where we are doing something new. The thing we did is the mongodb syntax
            {
                //Inside this set object, there will code for actual changes we want to make
                '$set': {
                    upvotes: articleInfo.upvotes + 1,
                },
            }
        );

        //Now, since the database has been updated. We are creating the new varibale that contains the updated data of the article
        const updatedArticleInfo = await db.collection('articles').findOne({name: articleName});
        res.status(200).json(updatedArticleInfo);
    }, res);
});

//Creating another route for the comments
app.post('/api/articles/:name/add-comment', (req,res)=>{
    withDB(async (db) => {
        //For getting comment from a user, we have made a json folder in body of postman where the name of user and their comment is recorded. So
        const { username, text } = req.body;
        const articleName = req.params.name;

        const articleInfo = await db.collection('articles').findOne({name: articleName});
        await db.collection('articles').updateOne(
            {name:articleName},
            {
                '$set': {
                    comments: articleInfo.comments.concat({ username, text}),
                },
            }
        );

        const updatedArticleInfo = await db.collection('articles').findOne({name: articleName});

        res.status(200).json(updatedArticleInfo);
    }, res);
})

//Explanation in notes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname + '/build/index.html'))
})

//=========================Now we have to start our server==================================
//We are just choosing 8000 as our endpoint. We can also choose 3000 instead
//Here, first argument of listen function is the endpoint and the second argument is the callback function that gets called when the server is listening.
//We are using console. So, once we run server by node src/server.js, if the server runs, then in the terminal, the message of console.log will be shown
app.listen(8000, () => console.log('Listening on port 8000'));



/*=======================================This is for understanding get and post functions============================
//When our app receives a get request on the endpoint/hello, the app should respond simply with hello. This means when we visit the url localhost:8000/hello, the page should display hello
//For this, .get method is used that has two parameters, one the url and the next is call back function. This call back function gets called whenever this endpoint is hit with get request
//The call back function has two arguments: request(contains details about the request that we received)    and:response(which can be used to send a response back)
//Here, .send() method sends a request back to whoever hit the endpoint and we are just going to say hello
app.get('/hello', (req, res) => res.send('Hello!'));

//Now, we want to get the data from the url. Eg: localhost:8000/hell/Mubson So, we want this Mubson to get For this, lets use a get function where name is stored in :name
app.get('/hello/:name', (req, res) => res.send(`Hello ${req.params.name}`));
//get request is used to get information from the server and post request is used to modify something on the server
app.post('/hello',(req, res) => res.send(`Hello ${req.body.name}!`));
=========================================================================================================================*/
