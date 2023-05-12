import * as Vue from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js'
import { mixin } from "https://mavue.mavo.io/mavue.js";
import GraffitiPlugin from 'https://graffiti.garden/graffiti-js/plugins/vue/plugin.js'
import Resolver from './resolver.js'

const app = {
  // Import MaVue
  mixins: [mixin],

  // Import resolver
  created() {
    this.resolver = new Resolver(this.$gf)
  },
  setup() {
    // Initialize the name of the channel we're chatting in
    const channel = Vue.ref('chat-app-demo');

    // And a flag for whether or not we're private-messaging
    const privateMessaging = Vue.ref(false);
    // If we're private messaging use "me" as the channel,
    // otherwise use the channel value
    const $gf = Vue.inject('graffiti')
    const context = Vue.computed(()=> privateMessaging.value? [$gf.me] : [channel.value]);

    // Initialize the collection of messages associated with the context
    const { objects: messagesRaw } = $gf.useObjects(context)
    return { channel, privateMessaging, messagesRaw }
  },

  data() {
    // Initialize some more reactive variables
    return {
      messageText: '',
      editID: '',
      editText: '',
      recipient: '',
      maxMessages: 10,
      numberOfMessages: 0,

      editProfile: false,
      editLatex: false,
      editCode: false,
      latexInput: '\\(2 + 2 = 5\\)',
      editUsername: false,
      
      deleteId: '',
      show : false,
      file : null,
      //////////////////////////////
      // Problem 1 solution
      preferredUsername: '',
      usernameResult: '',
      //////////////////////////////
      //////////////////////////////
      // Problem 2 solution
      recipientUsername: '',
      insertVisible: false,
      recipientUsernameSearch: '',
      //////////////////////////////
      //////////////////////////////
      // Problem 3 solution
      /////////////////////////////
      imageDownloads: {},

    }
  },

  //////////////////////////////
  // Problem 3 solution
  watch: {
    '$gf.me': async function(me) {
      let userName;
      userName = await this.resolver.actorToUsername(me);
      if(userName)
        this.$actorsToUsernames.value[me] = userName;
    },
    async messageText(text){
       this.$nextTick(()=>
        MathJax.typeset([document.querySelector("#mathjax_preview_content")]));
      
    },
    async latexInput(text){
      this.renderLatex(text);
    },
    async messages(messages) {
      this.$nextTick(()=>MathJax.typeset(['.message_content']));
      for (const m of messages) {
          if (!(m.actor in this.$actorsToUsernames.value)) {
            let userName;
            userName = await this.resolver.actorToUsername(m.actor);
            if(userName)
              this.$actorsToUsernames.value[m.actor] = userName;
          }
          if (m.bto && m.bto.length && !(m.bto[0] in this.$actorsToUsernames.value)) {
            let userName;
            userName = await this.resolver.actorToUsername(m.bto[0]);
            if(userName)
              this.$actorsToUsernames.value[m.bto[0]] =userName;
          }
        this.$gf.post(
        {
          type: 'Read',
          object: m.id,
          context: [ m.id ]
        });
      }
    },

    async messagesWithAttachments(messages) {
      for (const m of messages) {
        if (!(m.attachment.magnet in this.imageDownloads)) {
          this.imageDownloads[m.attachment.magnet] = "downloading"
          let blob
          try {
            blob = await this.$gf.media.fetch(m.attachment.magnet)
          } catch(e) {
            this.imageDownloads[m.attachment.magnet] = "error"
            continue
          }
          this.imageDownloads[m.attachment.magnet] = URL.createObjectURL(blob)
        }
      }
    }
  },
  /////////////////////////////

  computed: {
    mathJaxDetected(){
      return this.messageText.match(/\\\(.*\\\)|\$\$.*\$\$|\\\[.*\\\]/);
    },
    myUsername(){
      return this.$actorsToUsernames.value[this.$gf.me];
    },
    actorsToUsernames(){
      return this.$actorsToUsernames.value;
    },
    messages() {
      let messages = this.messagesRaw
        // Filter the "raw" messages for data
        // that is appropriate for our application
        // https://www.w3.org/TR/activitystreams-vocabulary/#dfn-note
        .filter(m=>
          // Does the message have a type property?
          m.type         &&
          // Is the value of that property 'Note'?
          m.type=='Note' &&
          // Does the message have a content property?
          (m.content || m.content == '') &&
          // Is that property a string?
          typeof m.content=='string')

      // Do some more filtering for private messaging
      if (this.privateMessaging) {
        messages = messages.filter(m=>
          // Is the message private?
          m.bto &&
          // Is the message to exactly one person?
          m.bto.length == 1 &&
          (
            // Is the message to the recipient?
            m.bto[0] == this.recipient ||
            // Or is the message from the recipient?
            m.actor == this.recipient
          ))
      }
      this.numberOfMessages = messages.length; 
      return messages
        // Sort the messages with the
        // most recently created ones first
        .sort((m1, m2)=> new Date(m2.published) - new Date(m1.published))
        // Only show the 10 most recent ones
        .slice(0,this.maxMessages);
    },

    messagesWithAttachments() {
      return this.messages.filter(m=>
        m.attachment &&
        m.attachment.type == 'Image' &&
        typeof m.attachment.magnet == 'string')
    },
  },

  methods: {
    renderLatex(text){
      this.$nextTick(()=>{
        const pre = document.querySelector("#latex_preview_content");
        if(pre){
          pre.innerHTML = text;
          MathJax.typesetPromise([pre]);
        }}
        );
    },
    math(){
      MathJax.typeset();
    },
    startLatexEdit(){
      this.editLatex =true;
      this.renderLatex(this.latexInput);
      this.insertVisible = false;
    },
    startCodeEdit(){
      this.editCode =true;
      this.insertVisible = false;
    },
    doneLatex(){
      this.messageText = this.latexInput;
      this.editLatex = false;
      document.querySelector("#text_input").focus();
    },
    cancelLatex(){
      this.editLatex = false;
    },
    getDate(dateString){
      const date = new Date(Date.parse(dateString));
      const now = new Date(Date.now());
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const daysAgo = Math.floor((Date.now() - date.getTime())/(24*60*60*1000)) 
                      - ((now.getHours() < hours ||
                         now.getHours() === hours &&
                         now.getMinutes() < minutes) ? 1: 0);
      
                         
      const time = `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0'+minutes : minutes}`;
      if(daysAgo === 0) return time;
      if(daysAgo === 1) return "Yesterday " + time;
      if(daysAgo < 7) return days[date.getDay()] + ' ' + time;
      const dateWithoutYear = date.getDate() +' '+ months[date.getMonth()]+' ' + time;
      if(now.getFullYear === date.getFullYear) return dateWithoutYear;
      return date.getFullYear() + dateWithoutYear;
    },
    onscroll(event){
      const {scrollHeight, scrollTop, clientHeight} = event.target;
      // console.log("whee", Math.abs(scrollHeight + scrollTop - clientHeight) );
      if (Math.abs(scrollHeight + scrollTop - clientHeight) <= 2) {
          if(this.maxMessages < this.numberOfMessages)
          this.maxMessages += 10;
      }
    },
    async sendMessage() {
      const message = {
        type: 'Note',
        content: this.messageText,
      }

      if (this.file) {
        message.attachment = {
          type: 'Image',
          magnet: await this.$gf.media.store(this.file)
        }
        this.file = null
      }
      
      this.messageText = '';

      // The context field declares which
      // channel(s) the object is posted in
      // You can post in more than one if you want!
      // The bto field makes messages private
      if (this.privateMessaging) {
        message.bto = [this.recipient]
        message.context = [this.$gf.me, this.recipient]
      } else {
        message.context = [this.channel]
      }

      // Send!
      this.$gf.post(message)
    },

    removeMessage(message) {
      this.$gf.remove(message)
    },
    deleteButton(message){
      this.deleteId = message.id;
    },
    startEditMessage(message) {
      // Mark which message we're editing
      this.editID = message.id
      // And copy over it's existing text
      this.editText = message.content
    },

    saveEditMessage(message) {
      // Save the text (which will automatically
      // sync with the server)
      message.content = this.editText
      // And clear the edit mark
      this.editID = ''
    },

    /////////////////////////////
    // Problem 1 solution
    async setUsername() {
      try {
        this.usernameResult = await this.resolver.requestUsername(this.preferredUsername)
        this.myUsername = this.preferredUsername
      } catch (e) {
        this.usernameResult = e.toString()
      }
    },
    /////////////////////////////

    /////////////////////////////
    // Problem 2 solution
    async chatWithUser() {
      this.recipient = await this.resolver.usernameToActor(this.recipientUsernameSearch)
      this.recipientUsername = this.recipientUsernameSearch
    },
    /////////////////////////////

    onImageAttachment(event) {
      const file = event.target.files[0]
      this.file = file
    }
  }
}


const Name = {
  props: ['actor', 'editable'],

  setup(props) {
    // Get a collection of all objects associated with the actor
    const { actor } = Vue.toRefs(props)
    const $gf = Vue.inject('graffiti')
    return $gf.useObjects([actor])
  },

  computed: {
    profile() {
      return this.objects
        // Filter the raw objects for profile data
        // https://www.w3.org/TR/activitystreams-vocabulary/#dfn-profile
        .filter(m=>
          // Does the message have a type property?
          m.type &&
          // Is the value of that property 'Profile'?
          m.type=='Profile' &&
          // Does the message have a name property?
          m.name &&
          // Is that property a string?
          typeof m.name=='string')
        // Choose the most recent one or null if none exists
        .reduce((prev, curr)=> !prev || curr.published > prev.published? curr : prev, null)
    }
  },

  data() {
    return {
      editing: false,
      editText: ''
    }
  },

  methods: {
    editName() {
      this.editing = true
      // If we already have a profile,
      // initialize the edit text to our existing name
      this.editText = this.profile? this.profile.name : this.editText
    },

    saveName() {
      if (this.profile) {
        // If we already have a profile, just change the name
        // (this will sync automatically)
        this.profile.name = this.editText
      } else {
        // Otherwise create a profile
        this.$gf.post({
          type: 'Profile',
          name: this.editText
        })
      }

      // Exit the editing state
      this.editing = false
    }
  },

  template: '#name'
}

const Like = {
  props: ["messageid"],

  setup(props) {
    const $gf = Vue.inject('graffiti')
    const messageid = Vue.toRef(props, 'messageid')
    const { objects: likesRaw } = $gf.useObjects([messageid])
    return { likesRaw }
  },
  computed: {
    likes() {
      return this.likesRaw.filter(l=>
        l.type == 'Like' &&
        l.object == this.messageid)
    },

    numLikes() {
      // Unique number of actors
      return [...new Set(this.likes.map(l=>l.actor))].length
    },

    myLikes() {
      return this.likes.filter(l=> l.actor == this.$gf.me)
    }
  },

  methods: {
    toggleLike() {
      if (this.myLikes.length) {
        this.$gf.remove(...this.myLikes)
      } else {
        this.$gf.post({
          type: 'Like',
          object: this.messageid,
          context: [this.messageid]
        })
      }
    }
  },

  template: '#like'
}

const ReadReceipts = {
  props: ['messageid', 'private'],

  setup(props) {
    const $gf = Vue.inject('graffiti')
    const messageid = Vue.toRef(props, 'messageid');
    const { objects: readsRaw } = $gf.useObjects([messageid]);
    return { readsRaw };
  },
  created() {
    this.resolver = new Resolver(this.$gf)
  },
  watch:{
    async readActors(newReadActors){
      for (const r of newReadActors) {
        if (!(r.actor in this.$actorsToUsernames.value)) {
          let userName;
          userName = await this.resolver.actorToUsername(r.actor);
          if(userName)
            this.$actorsToUsernames.value[r.actor] = userName;
        }
        if (r.bto && r.bto.length && !(r.bto[0] in this.$actorsToUsernames.value)) {
          let userName;
          userName = await this.resolver.actorToUsername(r.bto[0]);
          if(userName)
          this.$actorsToUsernames.value[r.bto[0]] = userName;
        }
      }
    }
  },
  computed: {
    reads() {
      return this.readsRaw.filter(r=>
        r.type == 'Read' &&
        r.object == this.messageid &&
        r.actor !== this.$gf.me)
    },
    readActors() {
      // Unique number of actors
      return [...new Set(this.reads.map(r=>r.actor))];
    },
    readUsernames(){
      return this.readActors.map((actor) => this.$actorsToUsernames.value[actor] ?? '');
    }
  },
  template: '#read_receipts',
  components: {Name},
}


const Replies = {
  props: ["messageid"],
  
  created() {
    this.resolver = new Resolver(this.$gf)
  },
  data() {
    return {
      replyText: '',
      viewReplies: false,
    }
  },
  setup(props) {
    const $gf = Vue.inject('graffiti')
    const messageid = Vue.toRef(props, 'messageid')
    const { objects: repliesRaw } = $gf.useObjects([messageid])
    return { repliesRaw }
  },
  watch:{
    async replyText(){
      this.$nextTick(()=> MathJax.typeset([this.$el.querySelector('.reply_mathjax_preview_content')]));
    },
    viewReplies(view){
      if(view) 
       this.$nextTick(()=>MathJax.typeset(['.reply_content']));
    },
    async replies(replies) {
      
      this.$nextTick(()=>MathJax.typeset(['.reply_content']));
      for (const r of replies) {
        if (!(r.actor in this.$actorsToUsernames.value)) {
          let userName;
          userName = await this.resolver.actorToUsername(r.actor);
          if(userName)
            this.$actorsToUsernames.value[r.actor] = userName;
        }
        if (r.bto && r.bto.length && !(r.bto[0] in this.$actorsToUsernames.value)) {
          let userName;
          userName = await this.resolver.actorToUsername(r.bto[0]);
          if(userName)
          this.$actorsToUsernames.value[r.bto[0]]= userName;
        }
      }
    }
  },
  computed: {
    
    mathJaxDetected(){
      return this.replyText.match(/\\\(.*\\\)|\$\$.*\$\$|\\\[.*\\\]/);
    },
    actorsToUsernames(){
      return this.$actorsToUsernames.value;
    },
    replies() {
      return this.repliesRaw.filter(r=>
        r.type == 'Note' &&
        r.content &&
        r.inReplyTo == this.messageid)
    },

  },

  methods: {
    toggleReplies(){
      if(this.viewReplies) this.viewReplies = false;
      else this.viewReplies = true;
    },
    sendReply() {
      this.$gf.post({
        type: 'Note',
        content: this.replyText,
        inReplyTo: this.messageid,
        context: [this.messageid]
      });
      this.replyText = ''
      this.viewReplies = true;
    }
  },
  components: {Name},

  template: '#replies'
}

const MagnetImg = {
  props: {
    src: String,
    loading: {
      type: String,
      default: 'https://upload.wikimedia.org/wikipedia/commons/9/92/Loading_icon_cropped.gif'
    },
    error: {
      type: String,
      default: '' // empty string will trigger broken link
    }
  },

  data() {
    return {
      fetchedSrc: ''
    }
  },

  watch: {
    src: {
      async handler(src) {
        this.fetchedSrc = this.loading
        try {
          this.fetchedSrc = await this.$gf.media.fetchURL(src)
        } catch {
          this.fetchedSrc = this.error
        }
      },
      immediate: true
    }
  },

  template: '<img :src="fetchedSrc" style="max-width: 8rem" />'
}

const ProfilePicture = {
  props: ['actor', 'editable'],

  setup(props) {
    // Get a collection of all objects associated with the actor
    const { actor } = Vue.toRefs(props)
    const $gf = Vue.inject('graffiti')
    return $gf.useObjects([actor])
  },
  watch:{
    async profile(profile){
      let blob
      try {
        blob = await this.$gf.media.fetch(profile.icon.magnet)
      } catch(e) {
        this.imageUrl= "error"
      }
      try{this.imageUrl = URL.createObjectURL(blob)}
      catch{this.imageUrl = "error"}

    }
  },

  computed: {
    profile() {
      return this.objects
        // Filter the raw objects for profile data
        // https://www.w3.org/TR/activitystreams-vocabulary/#dfn-profile
        .filter(m=>
          // Does the message have a type property?
          m.type &&
          // Is the value of that property 'Profile'?
          m.type=='Profile' &&
          // Does the message have an icon property?
          m.icon&&
          // Does the icon have type Image and magnet of type string
           m.icon.type =='Image' &&
           m.icon.magnet && 
           typeof m.icon.magnet == 'string'
          )
        // Choose the most recent one or null if none exists
        .reduce((prev, curr)=> !prev || curr.published > prev.published? curr : prev, null)
    }
  },

  data() {
    return {
      imageUrl: '',
      editing: false,
      file: '',
      magnet: ''
    }
  },

  methods: {
    changeImage(event) {
      const file = event.target.files[0]
      this.file = file
    },

    editImage() {
      this.editing = !this.editing;
    },

    async saveImage() {
      const magnetLink = await this.$gf.media.store(this.file);
      if (this.profile) {
        // If we already have a profile, just change the name
        // (this will sync automatically)
        this.profile.icon = {
          type: 'Image',
          magnet: magnetLink,
        }
      } else {
        // Otherwise create a profile
        this.$gf.post({
          type: 'Profile',
          icon: {
            type: 'Image',
            magnet: magnetLink,
          }
        });
      }

      // Exit the editing state
      this.editing = false
    }
  },

  template: '#profile_picture'
}

app.components = { Name, Like, ReadReceipts, Replies, ProfilePicture }
const vueApp = Vue.createApp(app)
   .use(GraffitiPlugin(Vue));
  vueApp.config.globalProperties.$actorsToUsernames = Vue.ref({});
  vueApp.mount('#app');
   
