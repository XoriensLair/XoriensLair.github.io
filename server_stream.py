# Takes care of running the server

from subprocess import Popen
import time
runtime = 86400 # Seconds between server restarts

while True:
    proc = Popen(['python','__init__.py'])
    newtime = time.time()+runtime

    curpoll = None
    while time.time() < newtime and curpoll == None:
        time.sleep(10)
        curpoll = proc.poll()
    if curpoll != None:
        print('Process ended prematurely with error code '+str(curpoll))
    else:
        proc.kill()


