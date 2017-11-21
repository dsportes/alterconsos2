AC.RequestErrorClass = function(code, t, m, rt, rm, qt, qm, qmode){
	this.code = code;
	this.t = t;
	this.m = m;
	this.rt = rt,
	this.rm = rm;
	this.qt = qt;
	this.qm = qm;
	this.qmode = qmode; // 0:out, 1:accueil, 2:retour saisie
	AC.RequestErrorClass[this.code] = this;
}
AC.RequestErrorClass.setup = function() {
	if (this.done)
		return;
	this.done = true;
	new AC.RequestErrorClass("A1",
	    "Signature non reconnue",
	    "Le mot de passe donné n'est pas <b>ou n'est plus</b> celui attendu", 
	    "Réessayer",
	    "Il y a peu de chance qu'un nouvel essai soit fructueux, sauf si un animateur " +
	        "vient de rétablir l'ancien mot de passe",
	    "Retour à l'accueil",
	    "Retour à l'accueil pour donner le bon (nouveau) mot de passe.", 1);
	new AC.RequestErrorClass("A2",
	    "Impossibilité de vérifier la signature",
	    "Un problème technique a empêché la vérification du mot de passe",
	    "Réessayer",
	    "Tenter une nouvelle vérification maintenant peut être efficace si l'incident était fugitif",
	    "Sortir de l'application",
	    "La sortie de l'application s'impose si le problème technique demeure", 0);
	new AC.RequestErrorClass("A3",
	    "Administrateur non reconnu",
	    "Le compte utilisé n'est pas enregistré en tant qu'administrateur général",
	    null, null,
	    "Sortir de l'application",
	    "Appeler ensuite la page d'accueil de l'administrateur général ( /admin.html)", 0);
	new AC.RequestErrorClass("B",
	    "Données saisies incorrectes",
	    "Les données saisies et transmises au serveur pour mise à jour ne sont pas correctes",
	    "Réessayer",
	    "Il y a peu de chance qu'un nouvel essai soit fructueux, sauf si un autre utilisateur a" +
	      " effectué des mises à jour qui rendraient désormais les données acceptables",
	    "Retour à la saisie",
	    "Corriger les données avant de redemander une mise à jour", 2);
	new AC.RequestErrorClass("C",
	    "Echec de synchronisation",
	    "La synchronisation des données de la session avec celle du serveur a échoué, " +
	      "les données affichées ont du retard par rapport à celles du serveur",
	    "Réessayer",
	    "Une nouvelle synchronisation sera tentée maintenant, si l'incident " +
	      "était fugitif l'incident sera résolu",
	    "Retour à l'affichage en cours",
	    "La page affichée sera cohérente, mais d'un état peut-être retardé. " +
	      "Toute navigation invoquera à nouveau une synchronisation risquant de rencontrer" +
	      " le même problème (ou non). Tenter régulièrement de synchroniser " +
	      "(en haut de l'écran à gauche, bouton flèche circulaire) jusqu'à réussite", 2);
	new AC.RequestErrorClass("D",
	    "Echec de synchronisation <b>après</b> enregistrement des mises à jour",
	    "La mise à jour des données <b>s'est correctement effectuée</b> " +
	      "mais <b>les données affichées ne reflètent pas les conséquences de la mise à jour</b>",
	    "Réessayer",
	    "La synchronisation après mise à jour va être tentée à nouveau " +
	      "(la mise à jour ne sera pas doublée) et " +
	      "si l'incident était fugitif il sera surmonté",
	    "Sortir de l'application",
	    "L'application locale <b>n'est pas cohérente avec la dernière mise à jour</b>. " +
	      "Elle est inutilisable en l'état, après sortie tenter ultérieurement d'y revenir", 0);
	new AC.RequestErrorClass("E",
	    "Incident <b>avant</b> mise à jour des données",
	    "Le serveur <b>n'a pas effectué de mise à jour</b>",
	    "Réessayer",
	    "La mise à jour va être tentée à nouveau (elle ne sera pas doublée) et " +
	      "si l'incident était fugitif il sera surmonté",
	    "Retour à la saisie",
	    "L'affichage est cohérent, <b>mais en tenant compte que " +
	      "la mise à jour demandée n'a pas été faite</b>: " +
	      "le travail peut continuer normalement, y compris la correction des données affichée " +
	      "(mais un nouvel échec reste possible)", 2);
	new AC.RequestErrorClass("F1",
	    "Echec de l'opération <b>pendant</b> la phase critique de mise à jour des données du serveur",
	    "Il est impossible de savoir, à cet instant, si la mise à jour a été faite ou non",
	    "Réessayer",
	    "La mise à jour va être tentée à nouveau et ne sera faite <b>que si elle ne l'avait pas été</b>" +
	    " (sans aucun risque de double mise à jour, mais un nouvel échec est possible). " +
	      "Si l'incident était fugitif il sera surmonté",
	    "Retour à la saisie",
	    "<b>Vérifier visuellement</b> si la mise à jour souhaitée a été, ou non, effectuée avant" +
	      " de soumettre à nouveau une mise à jour pour éviter tout risque de double mise à jour.", 2);
	new AC.RequestErrorClass("F2",
	    "Echec de l'opération <b>pendant</b> la phase critique de mise à jour des données du serveur",
	    "Il est impossible de savoir, à cet instant, si la mise à jour a été faite ou non",
	    "Réessayer",
	    "La mise à jour va être tentée à nouveau et ne sera faite <b>que si elle ne l'avait pas été</b>" +
	      " (sans aucun risque de double mise à jour, mais un nouvel échec est possible). " +
	      "Si l'incident était fugitif il sera surmonté",
	    "Sortir de l'application",
	    "Il est impossible de tenter à nouveau de refaire la mise à jour, " +
	      "l'incident s'étant trop prolongé. L'application locale <b>étant peut-être incohérente" +
	      " avec la dernière mise à jour (ou pas)</b> elle est inutilisable en l'état. " +
	      "Après sortie tenter ultérieurement d'y revenir " +
	      "et <b>vérifier visuellement</b> si la mise à jour souhaitée a été, ou non, effectuée", 0);
	new AC.RequestErrorClass("XX",
	    "Erreur mal identifiée",
	    "Il est impossible de savoir à quelle phase du traitement l'erreur s'est produite",
	    "Réessayer",
	    "Si l'incident était fugitif il sera surmonté",
	    "Sortir de l'application",
	    "Tenter de se connecter à nouveau après relance", 0);

};
	
AC.RequestErrorClass.get = function(code, req){
    if (code == 1){
    	if (APP.Ctx.authType == -1)
    		return this.A3;
    	else
    		return this.A1;
    } else if (req.op == "0"){
    	return this.A2;
    } else if (code == 2){
    	return this.B;
    } else if (req.op == "1" || req.op == "2"){
    	return this.C;
    } else if (code == 5 || code == 13){
    	return this.D;
    } else if (code == 3 || code == 6 || code == 10){
    	return this.E;
    } else if (code == 4 || code == 8 || code == 7 
        || code == 11 || code == 12){
      var n = AC.AMJ.sysTime() - req.trId;
      if (n < 60 * 60 * 1000) {
    	  return this.F1;
      } else {
    	  return this.F2;
      };
    }
    return this.XX;
};

/***********************************************/
AC.RequestError = function(request, code, text) {
	this.code = code;
	this.text = text;
	this.status = 0;
	
	if (this.code < 0 || this.code > 13)
		this.code = 0;
	this.trId = new Date(request.trId).stdFormat();
	this.text = "(" + this.code + " / " + this.status + ") " + (this.text == null ? "" : this.text);
	var i = this.text.indexOf("\n");
		if (i > 0 && i < text.length -1)
			this.shortText = this.text.substring(0,i);
		else
			this.shortText = this.text;
 
		var t = this.constructor.errorTypes[this.code];
		this.opName = request.name.escapeHTML();
		if (this.code >= 10)
			this.text = t[3] + (this.text.length != 0 ? " - " + this.text : "");
	this.nbTry = request.nbRetry == 0 ? "" : " - Reprise: " + request.nbRetry;
	this.qui = this.constructor.qui[t[0]];
	this.quand = this.constructor.quand[t[1]];
	if (["0", "1", "51", "53", "54", "55"].indexOf(request.op) != -1)
		this.quand = this.constructor.quand[1]; // op RO
	this.quoi = this.constructor.quoi[t[2]];
	this.raison = t[3];
	this.rec = AC.RequestErrorClass.get(this.code, request);
	AC.debug("Erreur [" + this.rec.code + "] : " + this.shortText + "\n");
}
AC.RequestError._static = {
	  qui : ["", 
	    "Application (logiciel) sur le serveur",
	  	"Environnement technique du serveur et/ou du réseau",
	  	"Application (logiciel) locale"],
	  	
	  quand : ["",
	       "Avant appel du serveur",
	       "Au cours de la lecture de données par le serveur (synchronisation)",
	       "Au cours d'une mise à jour par le serveur avant leur enregistrement",
	       "Au cours d'une mise à jour par le serveur pendant leur enregistrement",
	       "Au cours de la lecture de données par le serveur (synchronisation) après enregistrement des mises à jour"],

	  quoi : ["", 
	      "Incohérence des données envoyées",
	      "Situation inattendue : problème logiciel ou matériel / réseau"],
	
	  errorTypes :  [ 
	    ["?", "?", "?", "?"],
		[1, 1, 1, "Signature non reconnue"], //1
		[1, 1, 1, "Données envoyées pour mise à jour non acceptées"], //2
		[1, 2, 2, "Problème logiciel survenu avant mise à jour des données"], //3
		[1, 3, 2, "Problème logiciel survenu pendant la mise à jour des données"], //4
		[1, 4, 2, "Problème logiciel survenu après la mise à jour des données"], // 5
		[2, 1, 2, "Problème avant réception par le serveur"], //6
		[2, 3, 2, "Problème pendant le traitement par le serveur"], //7
		[2, 3, 2, "Rupture de communication pendant le traitement par le serveur"], //8
		[3, 1, 2, "Version de l'application dans le navigateur non à jour"], //9
		[3, 0, 2, "Problème logiciel : communication impossible avec le serveur"], //10
		[3, 3, 2, "Délai d'attente dépassé"], //11
		[3, 3, 2, "Appui sur le bouton d'interruption"], //12
		[3, 1, 2, "Problème logiciel : la réponse reçue du serveur est corrompue"] // 13
	  ]
}
AC.declare(AC.RequestError);

/***********************************************/
AC.Req = function(){}
AC.Req._static = {
	SADlapse : 180, // 3 minutes entre sync
	current : null,
	waiting : [],
	lastSyncOK : 0,
	nbOKRequest : 0,
	nbKORequest : 0,
	nbTotalRetry : 0,
	OKtotalLapse : 0,
	KOtotalLapse : 0,
	lastStatus : true,
	lastError : null,

	buildAbout : function(){
		var count = this.nbOKRequest + this.nbKORequest;
		var tl = this.OKtotalLapse + this.KOtotalLapse;
		var sb = new StringBuffer();
		sb.append("<i>Build: </i><b>" + ACSRV.build);
		sb.append("</b><i>Démarrage de la session: </i><b>" + new Date(ACSRV.localStartTime).format("Y-m-d H:i:s"));
		sb.append("</b><i>Numéro de la session: </i><b>" + APP.Ctx.clientId);
		sb.append("</b><i>Nombre de requêtes au serveur: </i>" + count + " (<i>dont KO: </i>" + this.nbKORequest + ")");
		
		var x = count != 0 ? "" + Math.floor((tl / count)) : "-";
		var y = this.nbOKRequest != 0 ? 
					"" + Math.floor((this.OKtotalLapse / this.nbOKRequest)) : "-";
		sb.append("<i>Temps de réponse moyen (ms): </i><b>" + x + "</b> (<i>OK: </i>" + y + ")");
		
		var n1 = this.lapseFromLastSync();
		if (n1 == -1){
			sb.append("<b>Aucune synchronisation valide faite</b>");
		} else {
			sb.append("<i>Dernière synchronisation valide il y a </i><b>" + INT.editLapse(n1));
			var n2 = Math.floor((AC.AMJ.sysTime() - AC.Cell.mostRecentChange()) / 1000);
			sb.append("</b><i>Données inchangées depuis </i></b>" + INT.editLapse(n2)) + "</b>";
		}
		return sb.buffer.join("<br>");
	},

	editLastError : function(){
		return AC.Mask.editErr(this.lastError, true);
	},
	
	syncAndDo : function(caller, cb) {
		var n1 = AC.Req.lapseFromLastSync();
		var b = AC.Cell.hasNeverSynchedCells();
		if (!b && this.lastStatus && n1 > 0 && n1 <= AC.Req.SADlapse) {
			if (cb && caller) {
				cb.call(caller);
			}
		} else {
			AC.Req.sync(caller, cb);
		}
	},

	sync : function(caller, callback, callbackERR) {
		var args = {op:"1", version:-1};
		if (AC.attente)
			args.attente = AC.attente;
		if (AC.erreur)
			args.erreur = AC.erreur;
		AC.Req.post(caller, "alterconsos", args, callback, callbackERR ? callbackERR : null);
	},

	submitForm: function(op, action, date, au, gr){
		var form = $("#genericForm");
		form.find("[name='ad']").val(APP.Ctx.authDir);
		form.find("[name='at']").val(APP.Ctx.authType);
		form.find("[name='d']").val(date ? date : "0");
		form.find("[name='ag']").val(APP.Ctx.authGrp ? APP.Ctx.authGrp : "0");
		form.find("[name='au']").val(au ? au : (APP.Ctx.authUsr ? APP.Ctx.authUsr : "0"));
		form.find("[name='gr']").val(gr ? gr : "0");
		form.find("[name='ap']").val(APP.Ctx.authPwd);
		form.find("[name='op']").val("" + op);
		var x = form.find("form");
		x.attr("action", action);
		form.find("form").trigger('submit');
	},

	submitForm2: function(op, file, param){
		var form = $("#genericForm");
		form.find("[name='ad']").val(APP.Ctx.authDir);
		form.find("[name='at']").val("0");
		form.find("[name='ag']").val(APP.Ctx.authGrp ? APP.Ctx.authGrp : "0");
		form.find("[name='au']").val("0");
		form.find("[name='param']").val(param);
		form.find("[name='op']").val("" + op);
		var x = form.find("form");
		x.attr("action", "alterconsos/export/" + file);
		form.find("form").trigger('submit');
	},

	handleFile: function (files, proxy, any) {
		if (AC.dbg)
			AC.info(files.length + "Fichiers choisis ... ");
	    // data:image/gif;base64, prefix de content
	    for (var i = 0, f; f = files[i]; i++) {
			if (AC.dbg)
				AC.info("Fichier " + i + " " + f.type + " " + f.name);
	    	// f.type f.name f.size
			if (!any && !f.type.match('image.*')) {
				continue;
			}
			var theFile = f;
			var reader = new FileReader();
			var p = proxy;
			reader.onloadend = function(progressEvent){
				var content = progressEvent.target.result; // en base 64 !!!
				p(content, theFile.name, theFile.type);
			};
			reader.onerror = function(e){
				p(null, theFile.name, e);
			};
			reader.readAsDataURL(f);
	    }
	},

	post : function(caller, path, args, callbackOK, callbackERR){
		var r = new AC.Req();
		r.caller = caller;
		r.callbackOK = callbackOK;
		r.callbackERR = callbackERR;
	    r.path = path;
	    r.args = args != null ? args : {};
	    if (args._isRaw){
	    	r.isRaw = true;
	    	delete args._isRaw;
	    } else
	    	r.isRaw = false;
	    if (args._signature){
	    	r.signature = true;
	    	delete args._signature;
	    } else
	    	r.signature = false;
	    r.nbRetry = 0;
	    r.op = r.args["op"];
	    if (AC.dbg) AC.assert(r.op != null);
	    if (r.op == "1"){
	    	r.name = "Synchronisation";
	    } else {
	    	r.name = r.args["operation"];
	    if (r.name == null)
	        r.name = "Opération " + r.op;
	    }
	    r.trId = AC.AMJ.sysTime() + APP.Ctx.delta; 
	    r.args["clientId"] = APP.Ctx.clientId;
	    if (ACSRV.build != null)
	    	r.args["build"] = ACSRV.build;
	    r.args["trId"] = r.trId;
	    var x = AC.Cell.buildSync();
	    r.args["sync"] = x.sync;
	    r.cells = x.cells;
	    if (!APP.startPhase) {
	    	r.args["ad"] = APP.Ctx.authDir;
	    	r.args["at"] = APP.Ctx.authType; 
	    	r.args["ag"] = APP.Ctx.authGrp;
	    	r.args["ap"] = APP.Ctx.authPwd; 
	    	r.args["au"] = "" + APP.Ctx.authUsr;
	    };
	    r.json = JSON.stringify(args);
	    if (AC.Req.current == null) {
	    	AC.Req.current = r;
	    	setTimeout(function() { r.go(); });
	    } else
	    	AC.Req.waiting.push(r);
	    return r;
	  },
	  
	  stop : function(){
	    if (AC.Req.current != null && AC.Req.current.xhr != null) {
	    	AC.Req.current.killed = true;
	    	AC.Req.current.xhr.abort();
	    }
	  },

	  completeOnError : function(){
		  if (AC.Req.current != null)
			  AC.Req.current.completeOnError();
	  },
	  
	  completeOnExit : function(mode){
		  if (AC.Req.current != null)
			  AC.Req.current.completeOnExit(mode);
	  },
	  
	  retry : function(){
		  AC.Mask.close();
		  if (AC.Req.current != null) {
			  AC.Req.current.nbRetry++;
			  AC.Req.current.go();
		  }
	  },
	  
	  lapseFromLastSync: function(){
		  if (AC.Req.lastSyncOK == 0)
			  return -1;
		  var n1 = AC.AMJ.sysTime() - AC.Req.lastSyncOK;
		  return Math.floor(n1 / 1000);
	  }

}
AC.Req._proto = {
	className : "Req",
	/*
	  bool isRaw;
	  bool signature;
	  String name;
	  String op;
	  int trId;
	  Map args;
	  String json;
	  String path;
	  Object caller;
	  Function callbackOK;
	  Function callbackERR;
	  HttpRequest request;
	  int start;
	  int duration;
	  int nbRetry;
	  Timer timer;
	  RequestError requestError;
	*/
			
	go : function() {
		this.killed = false;
		AC.Mask.open();
		if (this.timer != null)
			this.timer.cancel();
		AC.Message.info(this.name);
		this.timer = new AC.Timer(this, -1000, null, function(){
			var n = Math.round(this.lapse() / 1000);
		    AC.Message.info(this.name + " ... " + (n == 0 ? "" : "" + n + "s"));
		});
		var self = this;
		var exs;
		this.start = AC.AMJ.sysTime();
	    try {
			this.xhr = new XMLHttpRequest(); // create a new XHR		    
			this.xhr.open(this.args._GET ? "GET" : "POST", this.path, true);
			// Lignes suivantes ne marchent PAS sous Safari
			// this.xhr.onloadend = function (event) { self.onloadend(event); };
			// this.xhr.onerror = function(event) { self.onerror(event); };
			this.xhr.onabort = function(event) { self.onabort(event); };
			// Pour contourner Pb de Safari
			this.xhr.onreadystatechange = function(event) { self.onready(event); };
			this.xhr.send(this.args._GET ? null : this.json);
			return;
	    } catch (e){
	      exs = e.toString();
	    }
	    // ne pas gérer l'erreur sous try-catch
	    this.manageError(10, exs);
	},

	onabort : function(event){
	    if (this.xhr == null)
	        return;
	    this.manageError(12, "");
	},

	onerror : function(event){
	    if (this.xhr == null)
	        return;
	    var c = this.xhr.status;
	    var t = "" + c + " / " + this.xhr.statusText + "\n" + this.xhr.responseText;
	    // Les 300 et 400 sont AVANT traitement de la requête SAUF : 408
	    this.manageError(c < 500 && c != 408 ? 6 : 7, t);
	},
	
	onready : function(){
		if (this.xhr.readyState != 4)
			return;
		if (this.killed) {
			this.onabort();
			return;
		}
		if (this.xhr.status == 200 || this.xhr.status == 202) {
			this.onloadend();
			return;
		}
		this.onerror();
	},
	
	onloadend : function(event) {
		if (this.xhr == null)
			return;
		this.duration = this.lapse();
		if(this.xhr.status == 0)
			this.manageError(8, "status=0");
		else {
			var r = this.xhr.responseText;
			if (r != null && r.length > 2 && r.startsWith("\$")){
				var c;
				try { c = parseInt(r.substring(1,2));} catch(e) { c = 0;}
				var t = r.length > 3 ? r.substring(3,r.length) : "?";
				this.manageError(c, t);
			} else {
				if (!this.isRaw) {
					var exs;
					var obj = null;
		            try {
		            	obj = JSON.parse(r);
		            } catch (e) {
		            	exs = e.toString();
		            }
		            if (exs) // ne pas gérer l'erreur sous le try-catch
			            this.manageError(13, exs);
		            else
		            	this.complete(obj);
				} else
		            this.complete(r);
			};
		};
	},

	lapse : function(){
		return this.xhr == null ? 0 : AC.AMJ.sysTime() - this.start;
	},
		  
	manageError : function(code, text){
		this.duration = this.lapse();
		this.xhr = null;
		this.constructor.KOtotalLapse += this.duration;
		this.requestError = new AC.RequestError(this, code, text);
	    if ((this.signature && code == 1)) {
	    	this.completeOnError();
	    	return;
	    }
	    this.constructor.lastError = this.requestError;
	    if (code == 9)
	    	AC.Mask.showErrorVersion(text);
	    else
	    	AC.Mask.showError(this.requestError);
	},
		  
	next : function(ok) {
		this.xhr = null;
		this.constructor.current = null;
		this.constructor.lastStatus = ok;
	    if (ok) {
	    	this.constructor.nbOKRequest++;
	    	this.constructor.OKtotalLapse += this.duration;
			if (this.op == "1")
				this.constructor.lastSyncOK = this.start;
	    	AC.Message.info(this.name + " : OK");
			if (AC.dbg)
				AC.debug("HTTP : " + this.op + " / " + this.trId + "/ " + this.duration);
	    } else {
	    	this.constructor.nbKORequest++;
	    	AC.Message.error(this.name + " : " + this.requestError.shortText);
			if (AC.dbg)
				AC.debug("HTTP : " + this.op + " / " + this.trId + "/ " + this.duration + " / ERR: " + this.requestError.text);
	    }
	    if (this.constructor.waiting.length != 0){
	    	this.constructor.current = this.constructor.waiting[0];
	    	this.constructor.waiting.splice(0, 1);
	    	setTimeout(function() { AC.Req.current.go(); });
	    }
	    if (this.timer != null){
	    	this.timer.cancel();
	    	this.timer = null;
	    }
	    AC.Mask.close();
	    APP.refreshStatus();
	},
		  
	complete : function(result) {
		this.next(true);
   		if (!this.isRaw){
   			if (result) {
   				if (result.build)
   					this.constructor.srvBuild = result.build;
   				APP.Ctx.authUsr = result.au ? result.au : 0; 
   				APP.Ctx.authPower = result.al ? result.al : 0;
   			}
   			AC.Cell.update(result, this.cells);
   		}
		if (this.caller && this.callbackOK) {
			if (typeof this.callbackOK == 'string')
				AC.Message.info(this.callbackOK);
			else {
				this.callbackOK.call(this.caller, result);
			}
		}
	},
		  
	completeOnError : function(){
		this.next(false);
		if (this.callbackERR && this.caller) {
			if (typeof this.callbackERR == 'string')
				AC.Message.error(this.callbackERR + this.requestError.shortText);
			else
				this.callbackERR.call(this.caller, this.requestError);
		}
	},

	completeOnExit : function(mode){
		this.next(false);
		if (mode == "reload")
			APP.reload();
		else if (mode == "home")
			APP.goHome();
		else
			APP.goOut();
	}

}
AC.declare(AC.Req);

/***************************************************/
AC.Mask = {
	setup : function(){
		this.build = null;
		this.err = null;
		this.spin = false;
		this.isOpen = false;
		this._mask = $("#mask-element");
		this._attente = $("#mask-attente");
		this._erreur = this._mask.find("#mask-erreur");
		AC.oncl(AC.Req, this._attente, AC.Req.stop);
	},
	
	open : function(){
		this.reset();
		this._erreur.html("");
		this._erreur.css("display", "none");
		this._mask.css("display", "block");
		this.build = null;
		this.err = null;
		this.isOpen = true;
		this.timer = new AC.Timer(this, 2000, null, function(){ 
			this.startSpin();
		});
	},
	
	showErrorVersion : function(text){
		this.reset();
		this.setBuild(text);
	},

	showError : function(re){ // AC.RequestError
		this.reset();
		this.setErr(re);
	},
	
	reset : function(){
		this.stopSpin();
		if (this.timer) {
			this.timer.cancel();
			this.timer = null;
		}
	},
	
	close : function(){	
		this.reset();
		this._erreur.html("");
		this._erreur.css("display", "none");
		this._mask.css("display", "none");
		this.build = null;
		this.err = null;
		this.isOpen = false;
	},
				
	startSpin : function() {
		this.spin = true;
		this._attente.css("opacity", 0);
		this._attente.css("display", "block");
		var self = this;
		setTimeout(function() {
			self._attente.css("opacity", 0.7);
		}, 10);
	},

	stopSpin : function() {
		this.spin = false;
		this._attente.css("display", "none");
		this._attente.css("opacity", 0);
	},

	setBuild : function(build){
		this.build = build;
		this.err = null;
		var sb = new StringBuffer();
		sb.append("<div class='par bold large'>La version de l'application dans le navigateur ")
		.append(ACSRV.build).append(" n'est plus supportée par le serveur (version : ")
		.append(this.build).append(")</div>");
		sb.append("<div class='par medium'>Aprés appui sur le bouton ci-dessous, ")
		.append("l'application va être relancée et la dernière version sera utilisée.</div>");
		sb.append("<div class='talc'><div id='mask-quit' class='btn2'>Relancer l'application</div></div>");
		this._erreur.html(sb.toString());
		this._erreur.css("display", "block");
		AC.oncl(this, this._erreur.find("#mask-quit"), this.quit);
	},

	setErr : function(err){
		this.err = err;
		this._erreur.html(this.editErr(err));
		this._erreur.css("display", "block");
		AC.oncl(this, this._erreur.find("#mask-info"), this.help);
		AC.oncl(AC.Req, this._erreur.find("#mask-retry"), AC.Req.retry);
		AC.oncl(this, this._erreur.find("#mask-quit"), this.quit);
	},
	
	editErr : function(err, simple){
		if (err == null)
			return "";
		var sb = new StringBuffer();
	    sb.append("<div id='mask-info' class='action2'>Aide</div>");
	    sb.append("<div class='par large bold'>").append(err.shortText).append("</div>");
	    if (!simple) {
		    sb.append("<div class='par moyen bold'>").append(err.rec.t).append("</div>");
		    sb.append("<div class='par medium'>").append(err.rec.m).append("</div>");
		    if (err.rec.rt != null){
			    sb.append("<div class='panelrq'>");
			    sb.append("<div id='mask-retry' class='btn4'>").append(err.rec.rt).append("</div>");
			    sb.append("<div class='par medium'>").append(err.rec.rm).append("</div>");
			    sb.append("</div>");
		    }
		    sb.append("<div class='panelrq'>");
		    sb.append("<div id='mask-quit' class='btn4'>").append(err.rec.qt).append("</div>");
		    sb.append("<div class='par medium'>").append(err.rec.qm).append("</div>");
		    sb.append("</div>");
	    }
	    sb.append("<div class='sep medium'>").append("<i>Date et heure de l'échange : </i><b>").append(err.trId).append("</b><br>");
	    sb.append("<i><b>").append(err.opName).append("</b></i>").append(err.nbTry).append("<br>");
	    sb.append("<i>Code erreur :</i><b> ").append(err.code).append(" / ").append(err.status).append("</b><br>");
	    sb.append("<i>Nature :</i><b> ").append(err.raison).append("</b><br>");
	    sb.append("<i>Causée par :</i><b> ").append(err.qui).append("</b><br>");
	    sb.append("<i>Quand :</i><b> ").append(err.quand).append("</b><br>");
	    sb.append("<i>Catégorie de l'erreur :</i><b> ").append(err.rec.code).append("</b><br>");
	    sb.append("<i><b>Description détaillée : </b></i><br>").append(err.text).append("<br>");
	    sb.append("</div>");
	    sb.append("</div>");
	    return sb.toString();
	},
	
	help : function() {	
		AC.Help.gotoHelp("PbTech");
	}, 
		
	quit : function(){
		var qmode = this.err == null ? 0 : this.err.rec.qmode;
		if (qmode == 2)
			AC.Req.completeOnError();
		else
			AC.Req.completeOnExit(this.build != null ? "reload" : (qmode == 1 ? "home" : "out"));
	}
	
}
