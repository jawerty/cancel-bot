const fs = require('fs');
const child_process = require("child_process");

const puppeteer = require('puppeteer');

const { ArgumentParser } = require('argparse');
const { version } = require('./package.json');
 
const parser = new ArgumentParser({
  description: 'cancel-bot - Cancel YouTubers from your console'
});
 
parser.add_argument('-v', '--version', { action: 'version', version });
parser.add_argument('-c', '--channel', { help: 'Channel ID' });
parser.add_argument('-l', '--videocount', { help: 'Amount of videos we want to get' });

function timeout(miliseconds) {
	return new Promise((resolve	) => {
		setTimeout(() => {
			resolve()
		}, miliseconds)
	})
} 

const setupBrowser = async () => {
  const viewportHeight = 1024;
  const viewportWidth = 1080;
  const uBlockCrx = "/Users/jared/Downloads/uBlock0.chromium"
  const browser = await puppeteer.launch({ headless: false, args: [
    `--disable-extensions-except=${uBlockCrx}`, 
    `--load-extension=${uBlockCrx}`,
    '--enable-automation'
  ] });

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(0); 
  await page.setViewport({width: viewportWidth, height: viewportHeight});
  
  page.on('console', async (msg) => {
	const msgArgs = msg.args();
	for (let i = 0; i < msgArgs.length; ++i) {
	  try {
		console.log(await msgArgs[i].jsonValue());
	  } catch(e) {
	  	console.log(e);
	  }
    }
  });

  return [browser, page]
}


async function gettingChannelVideos(page, channel, videoCount) {
	console.log("Going to youtube for channel", channel)
	await page.goto(`https://www.youtube.com/${channel}/videos`)
	
	await page.waitForSelector("#video-title-link")

	const videoLinks = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("#video-title-link")).map((video) => {
			return video.href 
		})
	});
	return videoLinks;
}	

/* 
return an array of transcripts per video { 
	videoLink: string,
	transcript: {
		sentence: string,
		timestamp:
	}
}
*/
async function getTranscriptsForVideoHrefs(page, channelVideoHrefs) {
	// loop through the hrefs
	// for each
		// we have to go to the page
		// check if transcripts exist
			// if exist
				// open the show transcript modal (a series of interaction)
				// read the data from the transcript
			// else
				// continue

	for (let videoHref of channelVideoHrefs) {
		await page.goto(videoHref)
		await timeout(2000);
		await page.evaluate(() => {
			window.scrollBy(0, 1000)
		})
		await timeout(2000);
		await page.evaluate(() => {
			window.scrollBy(0, 1000)
		})
		await page.waitForSelector("ytd-watch-metadata #button-shape", { timeout: 60000 })
		const button = await page.evaluate(() => {
			console.log("button", document.querySelector("ytd-watch-metadata #button-shape") )
			return document.querySelector("ytd-watch-metadata #button-shape") 
		});
		button.click()
		await page.waitForSelector('ytd-menu-service-item-renderer')
		let showTranscriptButton = await page.evaluate(() => {
			return Array.from(document.querySelectorAll("ytd-menu-service-item-renderer")).filter((popupBtn) => {
				popupBtn.innerText.indexOf("Show transcript") > -1
			})
		});

		if (showTranscriptButton.length > 0) {
			showTranscriptButton = showTranscriptButton[0]
		} else {
			continue
		}

		showTranscriptButton.click()
	}
}


async function main() { 
	let { channel, videocount: videoCount } = parser.parse_args()
	videoCount = parseInt(videoCount)

	const [browser, page] = await setupBrowser();

	const channelVideoHrefs = await gettingChannelVideos(page, channel, videoCount);
	// await getTranscriptsForVideoHrefs(page, channelVideoHrefs)

	await browser.close();
	// download each with yt-dlp
	let toxicityCollection = {}
	for (let videoHref of channelVideoHrefs) {
		console.log("Downloading YT video", videoHref)
		const ytResult = child_process.spawnSync("yt-dlp", ["-o", "output.mp3", "-x" ,"--audio-format" , "mp3", videoHref])

		console.log("Parsing the transcript and getting the \"toxic\" sentences", videoHref)
		const result = child_process.spawnSync("python3" , ["yt_vid_toxicity_ranker.py"])
		
		child_process.spawnSync("rm", ["output.mp3"])
		const output = result.stdout.toString().trim()
		const endTagIndex = output.indexOf("[STARTOFOUTPUT]");
		if (endTagIndex > -1) {
			const toxicityOutput = JSON.parse(output.slice(endTagIndex+"[STARTOFOUTPUT]".length))
			toxicityCollection[videoHref] = toxicityCollection.concat(toxicityOutput)
			console.log("Successfully processed", videoHref)
		} else {
			console.log("UNSuccessfully processed", videoHref)
			console.log(result);
			console.log(result.stderr.toString().trim())
			console.log(result.stdout.toString().trim())
		}
	}

	const finalResult = toxicityCollection.sort((a, b) => {
		return b.toxicity - a.toxicity
	}).slice(0, 10);

	fs.writeFileSync("toxicity_results.json", JSON.stringify(finalResult));
	// after the download run the script t

	return true;
}

main();