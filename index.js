
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
    products: String,
    product_id: String,
    first_screan: Array
});
const db = mongoose.connection;
const id = '886794d32a252333baf09344ad60b290';
const key = 'c7e7ff7155725fcc748c750d31a28cf0';
const Request = require('request')
const cors = require('cors')
var count = 0;
var headersOpt = {
    "Content-Type": "application/json",
};


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
 console.log(req_body.message + ', order_id: ' + req_body.order_id);
    console.log('product: ' + req_body.products);
    let product_id = req_body.product_id;
    let products = req_body.products;

    Request({
            url: `https://${id}:${key}@shop-cn677.myinsales.ru/admin/products/${product_id}/supplementaries.json`,
            headers: {
                'content-type': 'application/json'
            },
        }, (err, response, body) => {
            if (IsJsonString(response.body)) {
                    var supplementaries = JSON.parse(response.body)
                    if (products == '') {
                        return false
                    }
                    products = products.split(',');
                    var product_not_available =  Object.assign([], supplementaries);
                    for (let i = 0; i < supplementaries.length; i++) {
                        for (let a = 0; a < products.length; a++){
                            if (supplementaries[i].id == products[a]) {
                                supplementaries[i].available = true;
                            }
                        }
                    }
                    var not_availible_products = []
                    for (let i = 0; i < supplementaries.length; i++) {
                        if (supplementaries[i].available == undefined ) {
                            not_availible_products.push(supplementaries[i].id)
                        }
                    }

                    req_body.first_screan = not_availible_products
                    order = new ORDER(req_body);
                    order.save().then(() => console.log('upload'));
            }
    })

}

function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}







// function Product_Available(item, order_id){
//     Request(`https://${id}:${key}@shop-cn677.myinsales.ru/admin/products/${item}.json`, (err, response, body) => {
//         if (IsJsonString(response.body)) {
//             var productsResponce = JSON.parse(response.body);
//             var properties = productsResponce.properties;
//             var product_id = productsResponce.id;
//             for (var prop in properties) {
//               if (properties[prop].permalink == 'dostupnost') {
//                 DataBaseUpDate(order_id, item)
//               }
//             }
//         }
//    });
// }







// function first_screan(obj){
//     console.log(obj)
// }




var interval = setInterval(function() {
    ORDER.find({}, function(err, orders) {
        if (err) return console.error(err);
        GetOrders(orders);
        console.log(count++)
    })
}, 100000)


function GetOrders(orders) {
    var mas = [];
    for (let i = 0; i < orders.length; i++) {
        var product_id = orders[i].product_id;
        var product_id_item = orders[i].product_id;
        var products_available =  orders[i].products;
        var order_id =  orders[i].order_id;
        var first_screan = orders[i].first_screan;
        var mongo_id = orders[i]._id;
        TESTSupplementaries(product_id, first_screan, order_id, mongo_id, product_id_item)
    }
}

function TESTSupplementaries(product_id, first_screan, order_id, mongo_id, product_id_item){
    if (first_screan.length == 0) {
        ORDER.deleteOne({
                _id: mongo_id
        }, function(err, orders) {console.log('remove')});
        return true
    }
    for (let i = 0; i < first_screan.length; i++) {
        AvailProduct(first_screan[i], order_id, mongo_id, product_id_item)
    }  
}

    function makeCounter() {
      let count = 0;

      return function() {
        console.log(count)
        if (count > 150000) {
            count = 20000; 
        }
        return count+=20000 // есть доступ к внешней переменной "count"
      };
    }

    var counter = makeCounter();



function AvailProduct(product_id, order_id, mongo_id, product_id_item){



    const promise_product = product_id => new Promise((resolves, rejects) => {
        var obj = {}

        Request(`https://${id}:${key}@shop-cn677.myinsales.ru/admin/products/${product_id}.json`, (err, response, body) => {
            if (IsJsonString(response.body)) {
                var productsResponce = JSON.parse(response.body);
                if (productsResponce.is_hidden) {
                  console.log('Недоступен' + productsResponce.title)
                  return false
                }else{
                  console.log('Доступен' + productsResponce.title);
                  DataBaseUpDate(product_id, order_id, mongo_id, product_id_item)
                  return true
                }
                
            }else{
               resolves(response)
            }

        }); 
    })

    promise_product(product_id).then(resolves => console.log(''), rejects => console.log(rejects))
}




function DataBaseUpDate(product_id, order_id, mongo_id, product_id_item) {
    ORDER.find({
        _id: mongo_id
    }, function(err, orders) {
        if (err) return console.error(err);
        
       if (orders[0].first_screan.length == 0) {
         ORDER.deleteOne({
            _id: mongo_id
        }, function(err, orders) {console.log('remove')});
        
        } else {
            var arr = orders[0].first_screan;
            var new_arr = [];
            var new_arr2 = [];

            arr.forEach(function(item, index, array) {
                if (item != product_id && !arr[index] == '') {
                    new_arr2.push(item)
                }
            });
            arr = new_arr2;

            ORDER.updateOne({
                _id: mongo_id
            }, {
                first_screan: arr
            }, function(err, result) {

                // mongoose.disconnect();
                if (err) return console.log(err);

             
                setTimeout(function(){
                    orderFields(order_id, product_id, product_id_item)
                }, counter())

                
            });
        }

    })
}







function orderFields(order_id, product_id, product_id_item){

    const promise_orderFields = order_id => new Promise((resolves, rejects) => {
         var fields_values_attributes = {
            "order": {
                "fields_values_attributes": [
                    {
                        'field_id': 13896766,
                        'value': `${product_id_item}`
                    }
                ]
            }
        }
        
        var url = `https://${id}:${key}@shop-cn677.myinsales.ru/admin/orders/${order_id}.json`;
        Request({
            method: 'put',
            url: url,
            body: fields_values_attributes,
            headers: headersOpt,
            json: true,
        }, function(error, response, body) {
            setTimeout(function(){SetStatus(order_id)}, 3000)
        });
    })

    promise_orderFields(order_id).then(resolves => console.log(123), rejects => console.log(rejects))

}


function SetStatus(order_id){


    const promise_Status = order_id => new Promise((resolves, rejects) => {
       
        var status = {
              "order": {
                  "custom_status_permalink": "obnovlen"
              }
        }
         var status = {
              "order": {
                  "custom_status_permalink": "obnovlen"
              }
        }
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
                      resolves()
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


    })

    promise_Status(order_id).then(resolves => console.log('SetStatus'), rejects => console.log(rejects))

}

