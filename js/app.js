var App = Em.Application.create();

DS.MongoHQRESTAdapter = DS.RESTAdapter.extend({
  baseUrl: 'https://api.mongohq.com/databases',
  baseUrlDocumentsPath: 'documents',
  bulkCommit: false,
  namespace: 'collections',
  
  ajax: function(url, type, hash) {
    hash.url = url + "?_apikey=" + this.apiKey;
    hash.type = type;
    hash.dataType = 'json';
    hash.contentType = 'application/json; charset=utf-8';
    hash.context = this;

    hash.dataFilter = function(data, type) {
      if(type !== 'json') return;
      
      var cleanedData = JSON.parse(data, function(k, v) {
        if(k === '_id') return v['$oid'];
        return v;
      });
      
      var wrappedData = {};
      wrappedData[this.url.split('/')[6]] = cleanedData;
      
      return JSON.stringify(wrappedData).replace(/_id/g, 'id');
    };
    
    if (hash.data && type !== 'GET') {
      hash.data = JSON.stringify(hash.data);
    }

    jQuery.ajax(hash);
  },
  
  createRecord: function(store, type, record) {
    var root = this.rootForType(type);

    var data = { 'document': record.toJSON() };

    this.ajax(this.buildURL(root), "POST", {
      data: data,
      context: this,
      success: function(json) {
        this.didCreateRecord(store, type, record, json);
      }
    });
  },
  
  buildURL: function(record, suffix) {
    var url = [];
    
    Ember.assert("Namespace URL (" + this.namespace + ") must not start with slash", !this.namespace || this.namespace.toString().charAt(0) !== "/");
    Ember.assert("Record URL (" + record + ") must not start with slash", !record || record.toString().charAt(0) !== "/");
    Ember.assert("Base URL Document Path (" + this.baseUrlDocumentsPath + ") must not start with slash", !this.baseUrlDocumentsPath || this.baseUrlDocumentsPath.toString().charAt(0) !== "/");
    Ember.assert("URL suffix (" + suffix + ") must not start with slash", !suffix || suffix.toString().charAt(0) !== "/");
    
    if (this.baseUrl !== undefined) {
      url.push(this.baseUrl);
    }
    
    if (this.database !== undefined) {
      url.push(this.database);
    }

    if (this.namespace !== undefined) {
      url.push(this.namespace);
    }

    url.push(this.pluralize(record));
    
    if (this.baseUrlDocumentsPath !== undefined) {
      url.push(this.baseUrlDocumentsPath);
    }
    
    if (suffix !== undefined) {
      url.push(suffix);
    }
    
    return url.join("/");
  }
});

App.Store = DS.Store.create({
  revision: 4,
  adapter: DS.MongoHQRESTAdapter.create({
    apiKey: '',
    database: 'the_syndicate'
  })
});

App.Feed = DS.Model.extend({
  title: DS.attr('string'),
  url: DS.attr('string')
});

App.FeedsController = Ember.ArrayController.create({
  content: []
});

App.FeedsController.set('content', App.Store.findAll(App.Feed));

App.FeedUrlTextView = Ember.TextField.extend({
  insertNewline: function() {
    App.Store.createRecord(App.Feed,  { title: this.get('value'), url: this.get('value') });
    App.Store.commit();
    
    this.set('value', '');
    this.$().blur();
  }
});

App.FeedsListView = Ember.CollectionView.extend({
  contentBinding: 'App.FeedsController',
  tagName: 'ul',
  itemViewClass: Ember.View.extend({
    templateName: 'feed-list-item-template',
    
    click: function() {
      alert('hi');
      return false;
    }
  })
});
