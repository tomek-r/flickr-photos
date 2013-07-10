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
        collectionName: 'favourite_items',
        collection: [],
        //Retrieves all items from local storage as an array
        retrieveCollection : function () {
            this.collection = localStorage[this.collectionName] ?
                localStorage[this.collectionName].split(';') :
                [];
        },
        //Saves all items to local storage as a string
        saveCollection : function () {
            localStorage[this.collectionName] = this.collection.join(';');
        },
        // Adds new item
        add : function (key) {
            this.collection.push(key);
            this.saveCollection();
        },
        //Removes item
        remove : function (key) {
            var index = this.getIndex(key);

            if (index !== -1) {
                this.collection.splice(index, 1);
                this.saveCollection();
            }
        },
        //Looks for item index in collection
        getIndex : function (key) {
            return $.inArray(key, this.collection);
        },
        //Wrapper for getIndex method
        isFavourite : function (key) {
            return this.getIndex(key) !== -1 ?
                true :
                false;
        }
    };

    Item.retrieveCollection();

    //Returns proper class name
    function chooseClass (src) {
        if (Item.isFavourite(src)) {
            return 'icon-heart';
        } else {
            return 'icon-heart-empty';
        }
    }

    //Adds like/dislike button
    function buttonAppender (ele, className) {
        $('<button />', {
            'type' : 'button',
            'class': className,
            'text': 'Favourite'
        }).appendTo(ele);
    }

    //Binds all user events
    function hookEvents ($holder, tags) {
        //click event
        var clickHandler = function (e) {
            e.preventDefault();
            
            var $button = $(this),
                src = $button.prev().attr('src');

            if (Item.isFavourite(src)) {
                Item.remove(src);
            } else {
                Item.add(src);
            }

            $button.attr('class', chooseClass(src));
        };

        $holder.on('click', 'button', clickHandler);

        infScroll({
            update: function (deferred) {
                loadAllPhotos(tags, max_per_tag, function (err, items) {
                    if (err) return;
                    
                    each(items.map(renderPhoto), imageAppender('photos'));
                    //we finished here so make the loader disappear
                    deferred.resolve();           
                });
            }
        });
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

    function infScroll (settings) {
        var options = {
                bottomOffset: 150,
                container: $('#photos'),
                ajaxLoader: $('#ajax-loader'),
                update: function (deferred) {}
            };

        if (settings) {
            options = $.extend(options, settings);
        }

        //cache
        var $w = $(window),
            $doc = $(document),
            isAjaxLoading = false;

        function handler (e) {
            //checks if ajax call is in progress, if so then do nothing
            if (isAjaxLoading) return;
            
            var waitForCallback = $.Deferred(),
                //some math to check if user scrolled to the bottom of page
                isBottomReached = $doc.height() - $w.height() - $w.scrollTop() < options.bottomOffset;

            if (isBottomReached) {
                isAjaxLoading = !isAjaxLoading;
                options.ajaxLoader.show();
                //deferred object is passed to callback function
                //to be resolved when ajax response is received
                //do whetever you want when user reached bottom of browser
                options.update(waitForCallback);
                //waits for ajax to finish before hides ajax loader and lets function
                //to make another call
                waitForCallback.done(function(){
                    isAjaxLoading = !isAjaxLoading;
                    options.ajaxLoader.hide();
                });
            }
        }

        function loadImagesAtStart () {
            //images are appended to DOM asynchroniously so we want a real height of element
            //that's why I push execution of anonymous function to a stack
            setTimeout(function(){
                //if images don't cover full-height of browser script fires scroll event,
                //which executes handler function
                if (options.container.height() < $w.height()) {
                    $doc.trigger('scroll');
                    loadImagesAtStart();
                }
            }, 200);
        }

        $doc.on('scroll', handler);

        loadImagesAtStart();
    }

    // ----
    
    var max_per_tag = 5;

    return function setup (tags, callback) {
        loadAllPhotos(tags, max_per_tag, function (err, items) {
            if (err) { return callback(err); }

            each(items.map(renderPhoto), imageAppender('photos'));
            hookEvents($('#photos'), tags);
            callback();
        });
    };
}(jQuery));