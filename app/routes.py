import requests
from flask import render_template

from app import app, config


@app.route('/')
def index():
    # Pull data from Lanyard
    user_id = '925855840022442004'
    lanyard_url = f'https://api.lanyard.rest/v1/users/{user_id}'
    lanyard_response = requests.get(lanyard_url)
    lanyard_data = lanyard_response.json()
    lanyard_profile_picture_url = f'https://cdn.discordapp.com/avatars/{user_id}/{lanyard_data["data"]["discord_user"]["avatar"]}.jpg?size=128'

    # Cast types otherwise it looks weird in the template
    username = str(lanyard_data['data']['discord_user']['username']) 
    status = str(lanyard_data['data']['activities'][0]['state']) 
    discord_status = str(lanyard_data['data']['discord_status'])
    listening_to_spotify = bool(lanyard_data['data']['listening_to_spotify'])

    # Check if listening_to_spotify is True before trying this
    # otherwise it throws an exception.
    if listening_to_spotify:
        spotify_album = str(lanyard_data['data']['spotify']['album'])
        spotify_album_art_url = str(lanyard_data['data']['spotify']['album_art_url'])
        spotify_artist = str(lanyard_data['data']['spotify']['artist'])
        spotify_song = str(lanyard_data['data']['spotify']['song'])

        # spotify has a special way of changing album art sizes
        # this is to change it to 300x300
        # we look for [12:16], and replace with f848
        
        art_hash = spotify_album_art_url[-40:]
        art_hash = art_hash[:12] + '1a9d' + art_hash[16:]
        spotify_album_art_url = spotify_album_art_url[:-40] + art_hash
    else:
        spotify_album = None
        spotify_album_art_url = None
        spotify_artist = None
        spotify_song = None

    # Pull plans from file
    try:
        with open(config.plans_path, 'r') as f:
            plans = f.read()
    except FileNotFoundError:
        plans = "Plans file not found. Sorry :/"

    return render_template('index.html', plans=plans, plans_path=config.plans_path, username=username, status=status, discord_status=discord_status, listening_to_spotify=listening_to_spotify, spotify_album=spotify_album, spotify_album_art_url=spotify_album_art_url, spotify_artist=spotify_artist, spotify_song=spotify_song, lanyard_profile_picture_url=lanyard_profile_picture_url)