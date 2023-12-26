#! /usr/bin/env node

const prompts = require('prompts');
const df = require('node-df');
const fs = require('fs');
const readline = require('readline');
const ytdl = require('ytdl-core');
const ytpl = require('ytpl');
const ffmpeg = require('fluent-ffmpeg');

var pathOutputFiles = ""
var audiobitrate = 0

function getTrackDo(link, name) {
    return new Promise((resolve) => {
        let download = ytdl(link, {
            quality: 'highestaudio',
        });
        const ffmpegCommand = ffmpeg({ timeout: 30 * 60 });
        ffmpegCommand
            .on('error', e => {
                reject(e);
            })
            .on('start', () => {
                console.log("[Start] " + name)
            })
            .on('end', () => {
                console.log("[End] " + name)
                resolve();
            })
            .input(download)
            .audioBitrate(audiobitrate || 256)
            .save(`${pathOutputFiles}/${name}.mp3`)
            .format('mp3');
    })
}

async function getPlaylist(playlistLink) {
    const playlist = await ytpl(playlistLink)
    pathOutputFiles += `/${playlist.author.name}`

    if (!fs.existsSync(pathOutputFiles)) fs.mkdirSync(pathOutputFiles)

    for (var i = 0; i < playlist.items.length; i++) {
        if (playlist.items[i]?.shortUrl) getTrackDo(playlist.items[i].shortUrl, playlist.items[i].title)
        if (playlist.items[i + 1]?.shortUrl) getTrackDo(playlist.items[i + 1].shortUrl, playlist.items[i + 1].title)
        if (playlist.items[i + 2]?.shortUrl) getTrackDo(playlist.items[i + 2].shortUrl, playlist.items[i + 2].title)
        if (playlist.items[i + 3]?.shortUrl) await getTrackDo(playlist.items[i + 3].shortUrl, playlist.items[i + 3].title)
        i = i + 3
    }
}

df(async (error, responseDF) => {
    if (error) return console.log(error)
    const choices = []
    responseDF?.map(v => { if (v.mount.startsWith("/media/")) choices.push({ title: v.mount.split("/")[3], value: v.mount }) })

    if (choices.length === 0) return console.log("Nao ha dispositivo para salvar musicas :)")

    const response = await prompts([{
            type: 'number',
            name: 'audiobitrate',
            message: 'Audio Bit Rate',
            validate: value => value < 64?`Mininum 64` : true
        },
        {
            type: 'select',
            name: 'type',
            message: 'Escolha o tipo de download',
            choices: [{
                    "tile": "Playlist",
                    "value": "Playlist"
                },
                {
                    "tile": "Track",
                    "value": "Track"
                }
            ],
            initial: 0
        },
        {
            type: 'select',
            name: 'value',
            message: 'Escolha um dispositivo',
            choices,
            initial: 0
        },
        {
            type: 'text',
            name: 'link',
            message: 'Qual o seu url?'
        }
    ]);

    pathOutputFiles = response.value
    audiobitrate = response.audiobitrate

    if (response.type === "Playlist") getPlaylist(String(response.link))
    else getTrackDo(String(response.link))

});