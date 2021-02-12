
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const urlencodedParser = bodyParser.urlencoded({
    extended: false
});
const PORT = process.env.PORT || 80;
const uri = "mongodb+srv://cmj:cmj123@cluster0.ksqhm.mongodb.net/<dbname>?retryWrites=true&w=majority";
const mongoose = require('mongoose');
const ORDER = mongoose.model('ORDER', {
    order_id: String,
    products: String
});
const db = mongoose.connection;
const id = '416e6ccc7351104ff0e3c2085e00fb8b';
const key = '38ba2e7d54ddfc77854cc8c25a43ad51';
const Request = require('request')
const cors = require('cors')
var count = 0;



mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
app.listen(PORT, () => {
    console.log("started server");
});



app.post("/", cors(), urlencodedParser, function(request, response) {
    console.log('post')
    DataBaseUpload(request, response)
    response.send('post')
});
app.get("/", function(request, response) {
    console.log('get')
    response.send('get')
});
app.get("/wakemydyno.txt", function(request, response) {
    response.send('wakemydyno')
});

function DataBaseUpload(request, response) {
    let req_body = JSON.parse(JSON.stringify(request.body));
    order = new ORDER(req_body);
    order.save().then(() => console.log('upload'));
}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function SetStatus(order_id, product_id){
       var status = {
              "order": {
                  "custom_status_permalink": "obnovlen"
              }
        }
        var headersOpt = {
                "Content-Type": "application/json",
        };

        function oldStatus(old_status) {
            var old_status = {
                "order": {
                    "custom_status_permalink": `${old_status}`
                }
            }
            
            var url = `https://${id}:${key}@shop-cn677.myinsales.ru/admin/orders/${order_id}.json`;
            Request({
                method: 'put',
                url: url,
                body: status,
                headers: headersOpt,
                json: true,
            }, function(error, response, body) {
                Request({
                    method: 'put',
                    url: url,
                    body: old_status,
                    headers: headersOpt,
                    json: true,
                }, function(error, response, body) {

                });
            });
        }
        
        Request({
            url: `https://${id}:${key}@shop-cn677.myinsales.ru/admin/orders/${order_id}.json`,
            headers: {
                'content-type': 'application/json'
            },
        }, (err, response, body) => {
            if (IsJsonString(response.body)) {
                var order = JSON.parse(response.body)
                var old_status = order.custom_status.permalink;
                oldStatus(old_status)
            }
        })
}


function DataBaseUpDate(order_id, product_id) {
    console.log(order_id, product_id)
    ORDER.find({
        order_id: order_id
    }, function(err, orders) {
        if (err) return console.error(err);

        if (orders[0].products == ',') {
             ORDER.deleteOne({
                order_id: orders[0].order_id
            }, function(err, orders) {console.log('remove')});
            
        } else {
            var arr = orders[0].products.split(',');
            var new_arr = [];
            var new_arr2 = [];

            arr.forEach(function(item, index, array) {
                if (item != product_id && !arr[index] == '') {
                    new_arr2.push(item)
                }
            });
            var string = new_arr2.join() + ',';

            ORDER.updateOne({
                order_id: orders[0].order_id
            }, {
                products: string
            }, function(err, result) {

                // mongoose.disconnect();
                if (err) return console.log(err);
                SetStatus(orders[0].order_id, product_id)

            });
        }
    })
}



function InsalesProductAvailable(orders) {

    var mas = [];
    for (let i = 0; i < orders.length; i++) {

        var order_id = orders[i].order_id;
        var arr = orders[i].products.split(',')
        arr = arr.filter(element => element !== '');
        if (arr.length == 0) {
            ORDER.deleteOne({
                order_id: orders[0].order_id
            }, function(err, orders) {console.log('remove')});
        }
        arr.forEach(function(item, index, array) {
            Product_req(item, order_id)
        });
    }
}


function Product_req(item, order_id){
    Request(`https://${id}:${key}@shop-cn677.myinsales.ru/admin/products/${item}.json`, (err, response, body) => {
        if (IsJsonString(response.body)) {
            var productsResponce = JSON.parse(response.body);
            var properties = productsResponce.properties;
            var product_id = productsResponce.id;
            for (var prop in properties) {
              if (properties[prop].permalink == 'dostupnost') {
                DataBaseUpDate(order_id, item)
              }
            }
        }
   });
}

var interval = setInterval(function() {
    ORDER.find({}, function(err, orders) {
        if (err) return console.error(err);
        InsalesProductAvailable(orders);
        console.log(count++)
    })
}, 100000)









