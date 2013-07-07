/*global jQuery*/

var setupPhotos = (function ($) {
    function each (items, callback) {
        var i;
        for (i = 0; i < items.length; i += 1) {
            setTimeout(callback.bind(this, items[i]), 0);
        }
    }

    function flatten (items) {
        return items.reduce(function (a, b) {
            return a.concat(b);
        });
    }

    var Item = {
        collection: [],
        //Retrieves all items from local storage as an array
        updateCollection : function() {
            this.collection = localStorage['favourites'] ?
                localStorage['favourites'].split(';') :
                [];
        },
        //Saves all items to local storage as a string
        saveCollection : function(items) {
            localStorage['favourites'] = this.collection.join(';');
        },
        // Adds new item
        add : function(key) {
            this.collection.push(key);
            this.saveCollection();
        },
        //Removes item
        remove : function(key) {
            var index = this.getIndex(key);

            if (index !== -1) {
                this.collection.splice(index, 1);
                this.saveCollection();
            }
        },
        //Looks for item index in collection
        getIndex : function(key) {
            return this.collection.indexOf(key);
        },
        //Wrapper for getIndex method
        isFavourite : function(key) {
            return this.getIndex(key) !== -1 ?
                true :
                false;
        }
    };

    Item.updateCollection();

    //Returns proper class name
    function chooseClass(src) {
        if (Item.isFavourite(src)) {
            return 'icon-heart';
        } else {
            return 'icon-heart-empty';
        }
    }

    function buttonAppender(ele, className) {
        var button = document.createElement('button');
        button.innerText = 'Favourite';
        button.type = 'button';
        button.className = className;
        ele.appendChild(button);
    }

    //Binds all user events
    function hookEvents(holder) {
        var clickHandler = function(e) {
            if (e.target.tagName == 'BUTTON') {
                var src = e.target.previousSibling.src;
                if (Item.isFavourite(src)) {
                    Item.remove(src);
                } else {
                    Item.add(src);
                }
                e.target.className = chooseClass(src);
            }
        };

        var container = document.getElementById(holder);
        container.addEventListener('click', clickHandler, false);
    }

    function loadPhotosByTag (tag, max, callback) {
        var photos = [];
        var callback_name = 'callback_' + Math.floor(Math.random() * 100000);

        window[callback_name] = function (data) {
            delete window[callback_name];
            var i;
            for (i = 0; i < max; i += 1) {
                photos.push(data.items[i].media.m);
            }
            callback(null, photos);
        };

        $.ajax({
            url: 'http://api.flickr.com/services/feeds/photos_public.gne',
            data: {
                tags: tag,
                lang: 'en-us',
                format: 'json',
                jsoncallback: callback_name
            },
            dataType: 'jsonp'
        });
    }

    function loadAllPhotos (tags, max, callback) {
        var results = [];
        function handleResult (err, photos) {
            if (err) { return callback(err); }

            results.push(photos);
            if (results.length === tags.length) {
                callback(null, flatten(results));
            }
        }

        each(tags, function (tag) {
            loadPhotosByTag(tag, max, handleResult);
        });
    }

    function renderPhoto (photo) {
        var img = new Image();
        img.src = photo;
        return img;
    }

    function imageAppender (id) {
        var holder = document.getElementById(id);
        return function (img) {
            var elm = document.createElement('div');
            elm.className = 'photo';
            elm.appendChild(img);

            buttonAppender(elm, chooseClass(img.src));

            holder.appendChild(elm);
        };
    }

    // ----
    
    var max_per_tag = 5;
    return function setup (tags, callback) {
        loadAllPhotos(tags, max_per_tag, function (err, items) {
            if (err) { return callback(err); }

            each(items.map(renderPhoto), imageAppender('photos'));
            hookEvents('photos');
            callback();
        });
    };
}(jQuery));
