import os, time, shutil
from configparser import ConfigParser
if not os.path.exists(os.path.join('logs','dump')):
    os.makedirs(os.path.join('logs','dump'))

from OpenSSL import crypto, SSL
from random import SystemRandom

r = SystemRandom()

def cert_gen(
    serialNumber=r.randint(333,99999999),
    validityStartInSeconds=int(time.time()),
    validityEndInSeconds=int(time.time())+10*365*24*60*60,
    KEY_FILE = os.path.join('ssl','key.pem'),
    CERT_FILE=os.path.join('ssl','cert.pem')):
    CERTCONFIG = ConfigParser()
    with open(os.path.join('config','cert.conf'),'r') as cfg:
        CERTCONFIG.read_file(cfg)

    emailAddress=CERTCONFIG['Info']['emailaddress']
    commonName=CERTCONFIG['Info']['commonname']
    countryName=CERTCONFIG['Info']['countryname']
    localityName=CERTCONFIG['Info']['localityname']
    stateOrProvinceName=CERTCONFIG['Info']['stateorprovincename']
    organizationName=CERTCONFIG['Info']['organizationname']
    organizationUnitName=CERTCONFIG['Info']['organizationunitname']
    #can look at generated file using openssl:
    #openssl x509 -inform pem -in selfsigned.crt -noout -text
    # create a key pair
    k = crypto.PKey()
    k.generate_key(crypto.TYPE_RSA, 4096)
    # create a self-signed cert
    cert = crypto.X509()
    cert.get_subject().C = countryName
    cert.get_subject().ST = stateOrProvinceName
    cert.get_subject().L = localityName
    cert.get_subject().O = organizationName
    cert.get_subject().OU = organizationUnitName
    cert.get_subject().CN = commonName
    cert.get_subject().emailAddress = emailAddress
    cert.set_serial_number(serialNumber)
    cert.gmtime_adj_notBefore(0)
    cert.gmtime_adj_notAfter(validityEndInSeconds)
    cert.set_issuer(cert.get_subject())
    cert.set_pubkey(k)
    cert.sign(k, 'sha512')
    with open(CERT_FILE, "wt") as f:
        f.write(crypto.dump_certificate(crypto.FILETYPE_PEM, cert).decode("utf-8"))
    with open(KEY_FILE, "wt") as f:
        f.write(crypto.dump_privatekey(crypto.FILETYPE_PEM, k).decode("utf-8"))

os.environ['NUMEXPR_MAX_THREADS'] = '16'

from api import *
import base64
import json
import datetime
from threading import Thread
from hashlib import sha256
from random import random,randint
import pickle
import logging
import logging.config
from urllib.parse import urlparse
import d20
from session import *
import markdown2

CONFIG = ConfigParser()
with open(os.path.join('config','server.conf'),'r') as cfg:
    CONFIG.read_file(cfg)

HELP_CONFIG = ConfigParser()
with open(os.path.join('config','help_pages.conf'),'r') as cfg:
    HELP_CONFIG.read_file(cfg)
HELP_CONFIG.optionxform = str


# options
IP = CONFIG['Runtime']['hostIP']
S_PORT = int(CONFIG['Runtime']['serverPort'])
A_PORT = int(CONFIG['Runtime']['apiPort'])
DIR = os.path.join(os.getcwd(),'client/')

LOG_LEVEL = CONFIG['Runtime']['logLevel']

MAX_LOG_SIZE = int(CONFIG['Runtime']['maxLogSize'])
        
class RunningInstance: # Currently running instance, maintains stateful presence between page resets
    def __init__(self):
        # Sets up the API instance
        self.sessions = {}
        self.users = []
        self.u_expire = {}
        self.logger = logging.LoggerAdapter(logging.getLogger('root'),{'location':'MAIN'})
        self.logger.setLevel(LOG_LEVEL)
        self.logger.debug('Instance loaded.')
        self.cached = {}
    
    def _check(self):
        for i in ['sessions','u_expire','logger','new_session','new_user','check_user','get_user_index','edit_name','session_cmd','get_session_info','modify_session','purge_session']:
            if not hasattr(self,i):
                return False
        return True

    def new_session(self,data): # name, password, id, fingerprint, OPTIONAL session data
        # Creates a new session and adds the user that creates it as a DM
        self.logger.debug('Creating session '+data['name']+' with ID '+data['id']+' and DM '+data['fingerprint'])
        if not 'password' in data.keys():
            data['password'] = None
        if 'session' in data.keys():
            self.logger.debug('Loading session from file.')
            self.sessions[data['id']] = {
                'name':data['name'],
                'password':data['password'],
                'instance':Session(self,data['id'],CONFIG,session=data['session'],name=data['name']),
                'expire':datetime.datetime.now()+datetime.timedelta(days=int(CONFIG['Sessions']['maintainSession'])),
                'last_update':time.time(),
                'users':[
                     {
                        'name':'Dungeon Master',
                        'fingerprint':data['fingerprint'],
                        'type':'dm',
                        'active':True,
                        'messages':[]
                    }
                ],
                'settings':{
                    'rollLogging':True
                }
            }
            self.u_expire[data['fingerprint']] = time.time()+int(CONFIG['Users']['userTimeout'])
        else:
            self.logger.debug('Creating session.')
            self.sessions[data['id']] = {
                'name':data['name'],
                'password':data['password'],
                'instance':Session(self,data['id'],CONFIG,name=data['name']),
                'expire':datetime.datetime.now()+datetime.timedelta(days=int(CONFIG['Sessions']['maintainSession'])),
                'last_update':time.time(),
                'users':[
                     {
                        'name':'Dungeon Master',
                        'fingerprint':data['fingerprint'],
                        'type':'dm',
                        'active':True,
                        'messages':[]
                    }
                ],
                'settings':{
                    'rollLogging':True
                }
            }
            self.u_expire[data['fingerprint']] = time.time()+int(CONFIG['Users']['userTimeout'])
        code, r = self.check_user({'fingerprint':data['fingerprint']})
        return code, r
    
    def new_user(self,data): # id, password, name, fingerprint
        self.logger.debug('New user joining session '+data['id']+' with name '+data['name']+' and fingerprint '+data['fingerprint'])
        # Adds a new user to a session if they have the correct password
        if not 'password' in data.keys():
            data['password'] = None
        if data['id'] in self.sessions.keys():
            if data['password'] == self.sessions[data['id']]['password'] or self.sessions[data['id']]['password'] == None:
                self.sessions[data['id']]['users'].append({
                    'name':data['name'],
                    'fingerprint':data['fingerprint'],
                    'type':'pc',
                    'active':True,
                    'messages':[]
                })
                self.u_expire[data['fingerprint']] = time.time()+int(CONFIG['Users']['userTimeout'])
                code, r = self.check_user({'fingerprint':data['fingerprint']})
                return code, r
            self.logger.warning('User',data['fingerprint'],'tried to join session',data['id'],'with incorrect password',data['password'])
            return 200, {'code':403}
        self.logger.warning('User',data['fingerprint'],'tried to join nonexistent session with ID',data['id'])
        return 200, {'code':404}
    
    def check_user(self,data): # fingerprint
        # Determines if a user's fingerprint is registered, and returns a session ID if they are.
        new_cached = {}
        for k in self.cached.keys():
            if data['fingerprint'] in self.cached[k]['userIds']:
                if os.path.exists('cache'):
                    if os.path.exists(os.path.join('cache','session_'+str(k)+'.cache')):
                        with open(os.path.join('cache','session_'+str(k)+'.cache'),'rb') as cache:
                            self.sessions[k] = pickle.load(cache)
                            self.logger.debug('Loaded session '+k+' from cache')
                        os.remove(os.path.join('cache','session_'+str(k)+'.cache'))
                else:
                    self.logger.error('Cache folder deleted. Clearing cache registry.')
                    self.cached = {}
            else:
                new_cached[k] = self.cached[k]
        self.cached = new_cached.copy()
        for s in list(self.sessions.keys()):
            for u in self.sessions[s]['users']:
                if data['fingerprint'] == u['fingerprint']:
                    return 200, {'found':True,'sid':s,'type':u['type']}
        return 200, {'found':False,'sid':None,'type':None}
    
    def get_user_index(self,sid,fp): # Utility function
        for k in range(len(self.sessions[sid]['users'])):
            if self.sessions[sid]['users'][k]['fingerprint'] == fp:
                return k
        return -1
    
    def edit_name(self,data): # sid, fingerprint, name
        self.logger.debug('User '+data['fingerprint']+' is attempting to change their name to '+data['name'])
        # Edits player name
        if data['sid'] in self.sessions.keys():
            ind = self.get_user_index(data['sid'],data['fingerprint'])
            if ind > -1:
                self.sessions[data['sid']]['users'][ind]['name'] = data['name']
                return 200, {'code':200}
            else:
                self.logger.error('User '+fp+' failed to change name: Not in session.')
                return 200, {'code':404,'reason':'Cannot find that user in the session.'}
        else:
            self.logger.error('User '+fp+' failed to change name: Session does not exist.')
            return 200, {'code':404,'reason':'Cannot find that session.'}
    
    def session_cmd(self,data): # sid, fingerprint, command, args
        if not (data['command'] == 'initiative' and 'check' in data['args'].split('|')):
            self.logger.debug('User '+data['fingerprint']+' sending command '+data['command']+' to session '+data['sid']+' with '+str(len(data['args'].split('|')))+' arguments.')
        new_cached = {}
        for k in self.cached.keys():
            if data['fingerprint'] in self.cached[k]['userIds']:
                if os.path.exists('cache'):
                    if os.path.exists(os.path.join('cache','session_'+str(k)+'.cache')):
                        with open(os.path.join('cache','session_'+str(k)+'.cache'),'rb') as cache:
                            self.sessions[k] = pickle.load(cache)
                            self.logger.debug('Loaded session '+k+' from cache')
                        os.remove(os.path.join('cache','session_'+str(k)+'.cache'))
                else:
                    self.logger.error('Cache folder deleted. Clearing cache registry.')
                    self.cached = {}
            else:
                new_cached[k] = self.cached[k]
        # Acts as an intermediary handler between the RunningInstance and the session specific to the user, and handles permissions.
        code, dat = self.check_user({'fingerprint':data['fingerprint']})
        if dat['sid'] == data['sid']:
            with open('permissions.json','r') as perms:
                pdict = json.loads(perms.read())
                if data['command'] in pdict.keys():
                    if dat['type'] in pdict[data['command']].split(','):
                        return 200, getattr(self.sessions[data['sid']]['instance'],data['command'])(data['fingerprint'],data['args'].split('|'))
                    else:
                        self.logger.warning('User '+data['fingerprint']+' failed to execute '+data['command']+' on session '+data['sid']+' - Access denied to command.')
                        return 200, {'code':403,'reason':'Forbidden: User does not have access to the command "'+data['command']+'".'}
                else:
                    self.logger.warning('User '+data['fingerprint']+' failed to execute '+data['command']+' on session '+data['sid']+' - Command not found.')
                    return 200, {'code':404,'reason':'Not Found: Command "'+data['command']+'" not found.'}
        else:
            self.logger.error('User '+data['fingerprint']+' failed to execute '+data['command']+' on session '+data['sid']+' - Access denied to session.')
            return 200, {'code':403,'reason':'Forbidden: User does not have access to the requested session.'}
    
    def get_session_info(self,data): # sid
        # Get information relating to the session
        if data['sid'] in self.cached.keys():
            if os.path.exists('cache'):
                if os.path.exists(os.path.join('cache','session_'+str(data['sid'])+'.cache')):
                    with open(os.path.join('cache','session_'+str(data['sid'])+'.cache'),'rb') as cache:
                        self.sessions[data['sid']] = pickle.load(cache)
                        self.logger.debug('Loaded session '+data['sid']+' from cache')
                    os.remove(os.path.join('cache','session_'+str(data['sid'])+'.cache'))
                del self.cached[data['sid']]
            else:
                self.logger.error('Cache folder deleted. Clearing cache registry.')
                self.cached = {}
        if data['sid'] in self.sessions.keys():
            usersDict = {}
            c = 0
            for i in self.sessions[data['sid']]['users']:
                nmsgs = []
                for m in range(len(self.sessions[data['sid']]['users'][c]['messages'])):
                    if self.sessions[data['sid']]['users'][c]['messages'][m]['timestamp']+int(CONFIG['Misc']['messageTimeout']) > time.time():
                        nmsgs.append(self.sessions[data['sid']]['users'][c]['messages'][m])
                self.sessions[data['sid']]['users'][c]['messages'] = nmsgs

                usersDict[i['fingerprint']] = i
                if self.sessions[data['sid']]['users'][c]['fingerprint'] == data['print']:
                    self.u_expire[data['print']] = time.time()+int(CONFIG['Users']['userTimeout'])
                    self.sessions[data['sid']]['users'][c]['active'] = True
                c += 1
            
            self.sessions[data['sid']]['expire'] = datetime.datetime.now()+datetime.timedelta(days=int(CONFIG['Sessions']['maintainSession']))
            self.sessions[data['sid']]['last_update'] = time.time()

            return 200, {
                'code':200,
                'hasPassword':bool(self.sessions[data['sid']]['password']),
                'name':self.sessions[data['sid']]['name'],
                'users':usersDict,
                'session':self.sessions[data['sid']]['instance'].jsonify(),
                'settings':json.dumps(self.sessions[data['sid']]['settings']),
                'help_pages':json.dumps({s:dict(HELP_CONFIG.items(s)) for s in HELP_CONFIG.sections()})
            }
        else:
            return 200, {'code':404}
    
    def modify_session(self,data): # sid, fingerprint, newname, newpass, settings
        self.logger.debug('User '+data['fingerprint']+' is modifying session '+data['sid'])
        # Modify session information
        if not 'newpass' in data.keys():
            data['newpass'] = None
        code, dat = self.check_user({'fingerprint':data['fingerprint']})
        if dat['sid'] == data['sid'] and dat['type'] == 'dm':
            self.sessions[data['sid']]['name'] = data['newname']
            self.sessions[data['sid']]['password'] = data['newpass']
            self.sessions[data['sid']]['settings'] = data['settings']
            return 200, {'code':200}
        else:
            self.logger.warning('User '+data['fingerprint']+' failed to modify session '+data['sid']+' - No access.')
            return 200, {'code':403,'reason':'You don\'t have access to this feature in this server.'}
    
    def purge_session(self,data): # sid, fingerprint
        self.logger.debug('User '+data['fingerprint']+' is purging session '+data['sid'])
        # Clear session info
        code, dat = self.check_user({'fingerprint':data['fingerprint']})
        if dat['sid'] == data['sid'] and dat['type'] == 'dm':
            self.sessions[data['sid']]['instance'] = Session()
            return 200, {'code':200}
        else:
            self.logger.error('User '+data['fingerprint']+' failed to purge session '+data['sid']+' - No access.')
            return 200, {'code':403,'reason':'You don\'t have access to this feature in this server.'}



# main code
logging.config.fileConfig('logging.conf')
ROOTLOG = logging.LoggerAdapter(logging.getLogger('root'),{'location':'ROOT'})
ROOTLOG.setLevel(LOG_LEVEL)
ROOTLOG.info('Server started.')
ROOTLOG.info('Stored latest.log to logs/dump/historical_log_'+time.asctime().replace(' ','_').replace(':','_')+'.log')

# Sets up instance
if os.path.exists('state.stor'):
    ROOTLOG.info('Found state.stor file. Loading saved instance.')
    with open('state.stor','rb') as state:
        instance = pickle.load(state)
        if hasattr(instance,'_check'):
            if instance._check:
                ROOTLOG.info('Loaded and checked saved instance.')

            else:
                ROOTLOG.info('Instance check failed, running clean instance.')
                instance = RunningInstance()
        else:
            ROOTLOG.info('Instance check failed, running clean instance.')
            instance = RunningInstance()
else:
    ROOTLOG.info('No state.stor file found. Running clean instance.')
    instance = RunningInstance()

for cache in instance.cached.keys():
    try:
        with open(os.path.join('cache','session_'+str(cache)+'.cache'),'rb') as f:
            _load = pickle.load(f)
            _load['last_update'] = time.time()
            instance.sessions[cache] = _load
    except FileNotFoundError:
        pass
instance.cached = {}
try:
    shutil.rmtree('cache')
except FileNotFoundError:
    pass

def load_docs():
    if (os.path.exists(os.path.join('client','docs_md'))):
        if os.path.exists(os.path.join('client','docs_html')):
            shutil.rmtree(os.path.join('client','docs_html'))
        os.mkdir(os.path.join('client','docs_html'))
        for doc in os.listdir(os.path.join('client','docs_md')):
            with open(os.path.join('client','docs_md',doc),'r') as old_f:
                with open(os.path.join('client','docs_html',doc.split('.')[0]+'.html'),'w') as new_f:
                    new_file = markdown2.markdown(old_f.read(),extras=[
                            'break-on-newline',
                            'fenced-code-blocks',
                            'cuddled-lists',
                            'header-ids',
                            'numbering',
                            'spoiler',
                            'strike',
                            'tables',
                            'target-blank-links'
                        ])

                    fullstr = ''.join([
                        '<head>\n',
                        '\t<title>Documentation - '+doc.split('.')[0]+'</title>\n',
                        '\t<link rel="stylesheet" type="text/css" href="../style/docs.css">\n',
                        '</head>\n',
                        '<body>\n\t',
                        '\n\t'.join(str(new_file).split('\n'))+'\n',
                        '</body>'
                    ])
                    new_f.write(fullstr)

def check_all():
    global instance, ROOTLOG, HELP_CONFIG
    last_help_update = 0
    while True:
        nse = {}
        for i in instance.sessions.keys():
            if instance.sessions[i]['expire'] <= datetime.datetime.now()+datetime.timedelta(days=int(CONFIG['Sessions']['maintainSession'])):
                nse[i] = instance.sessions[i]
                for u in range(len(instance.sessions[i]['users'])):
                    if instance.u_expire[instance.sessions[i]['users'][u]['fingerprint']] < time.time() and instance.sessions[i]['users'][u]['active']:
                        instance.sessions[i]['users'][u]['active'] = False
                        ROOTLOG.debug(instance.sessions[i]['users'][u]['fingerprint'] + ' lost connection.')
                if instance.sessions[i]['last_update']+int(CONFIG['Sessions']['cacheSession']) < time.time():
                    ROOTLOG.debug('Caching session '+str(i))
                    if not os.path.exists('cache'):
                        os.makedirs('cache')
                    with open(os.path.join('cache','session_'+str(i)+'.cache'),'wb') as cache:
                        pickle.dump(instance.sessions[i],cache)
                    del nse[i]
                    instance.cached[str(i)] = {
                        'expire':instance.sessions[i]['expire'],
                        'userIds':[u['fingerprint'] for u in instance.sessions[i]['users']]
                    }
            else:
                ROOTLOG.info('Killed session '+str(i))
        
        new_cached = {}
        for c in instance.cached.keys():
            if instance.cached[c]['expire'] >= datetime.datetime.now()+datetime.timedelta(days=int(CONFIG['Sessions']['maintainSession'])):
                ROOTLOG.info('Killing cached session '+str(c))
                if os.path.exists(os.path.join('cache','session_'+str(c)+'.cache')):
                    os.remove(os.path.join('cache','session_'+str(c)+'.cache'))
            else:
                new_cached[c] = instance.cached[c]
        instance.cached = new_cached.copy()

        if last_help_update + 5 < time.time():
            load_docs()
            nHELP_CONFIG = ConfigParser()
            nHELP_CONFIG.optionxform = str
            with open(os.path.join('config','help_pages.conf'),'r') as cfg:
                nHELP_CONFIG.read_file(cfg)
            HELP_CONFIG = nHELP_CONFIG
            HELP_CONFIG.optionxform = str
            last_help_update = time.time()
                

        with open('state.stor','wb') as store:
            pickle.dump(instance,store)

        instance.sessions = nse.copy()
        time.sleep(1)

def log_thread():
    global ROOTLOG, MAX_LOG_SIZE
    while True:
        if os.stat(os.path.join('logs','latest.log')).st_size > MAX_LOG_SIZE:
            fname = os.path.join('logs','dump','historical_log_'+time.asctime().replace(' ','_').replace(':','_')+'.log')
            ROOTLOG.info('latest.log exceeded '+str(MAX_LOG_SIZE/1000)+' kilobytes. Moving to logs/dump/historical_log_'+time.asctime().replace(' ','_').replace(':','_')+'.log')
            with open(fname,'w') as f:
                pass
            shutil.copy(os.path.join('logs','latest.log'),fname)
            with open(os.path.join('logs','latest.log'),'w') as f:
                f.write('')
        time.sleep(10)

if not os.path.exists('ssl'):
    os.makedirs('ssl')
    cert_gen()

# Activates PyLink instance and sets commands
ROOTLOG.info('Running LINK API on '+IP+':'+str(A_PORT))
LINK = PyLink(
    IP,A_PORT,os.path.join('ssl','key.pem'),os.path.join('ssl','cert.pem'),
    newsession=instance.new_session,
    joinsession=instance.new_user,
    checkuser=instance.check_user,
    scmd=instance.session_cmd,
    gsi=instance.get_session_info,
    editname=instance.edit_name,
    modsession=instance.modify_session,
    purge=instance.purge_session
)

checker = Thread(target=check_all,name='check_thread')
checker.start()
ROOTLOG.info('Launched check_thread.')

logdump = Thread(target=log_thread,name='log_thread')
logdump.start()
ROOTLOG.info('Launched log_thread.')

# Activates servers
ROOTLOG.info('Launching PyLink instance.')
LINK.serve_forever()