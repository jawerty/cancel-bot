# cancel-bot
Find "cancelable" comments Youtubers make using a "toxicity" classifier.

Created during [this livestream](https://youtube.com/live/FyYyNsaXgUM).

Mostly funny but actually kind of works.


Using this classifier that labels toxic content [https://huggingface.co/unitary/toxic-bert?text=Black+guy+bad](https://huggingface.co/unitary/toxic-bert?text=Black+guy+bad)

# How to install
First you need to clone the repo
```
 $ git clone git@github.com:jawerty/cancel-bot.git
 $ cd cancel-bot
```
Then install the node modules
```
$ npm install
```

Then you need to install the 3rd party packages
- OpenAI Whisper
```
$ pip install -U openai-whisper
```
- yt-dlp
```
$ python3 -m pip install -U yt-dlp
```
- detoxify
```
$ pip install detoxify
```

# How to run 
- -c = the channel name
- -l = the amount of videos you want to scrape
```
$ node cancel-bot.js -c @jaredthecoder -l 10
```