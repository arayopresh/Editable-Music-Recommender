//right so the important parttt-- make up a lsitening history of a streaming account
//array of fake data ;p


export const History = [
    {title: 'West Coast' , artist: 'Lana Del Rey', playlist: 'Liked songs', plays: 7, tag: 'alternative'},
    {title: 'Cruel World', artist: 'Lana Del Rey', playlist: 'somewhere else', plays: 8, tag: 'alternative'},
    {title: 'National Anthem', artist: 'Lana Del Rey', playlist: 'on repeat', plays: 11, tag: 'alternative'},
    {title: 'Off to the Races', artist: 'Lana Del Rey', playlist: "pre's", plays: 6, tag: 'alternative'},
    {title: 'God Knows I Tried', artist: 'Lana Del Rey', playlist: 'in my feelings', plays: 5, tag: 'dream-pop'},
    {title: 'Without You', artist: 'Lana Del Rey', playlist: 'somewhere else', plays: 7, tag: 'alternative'},
    {title: 'Ultraviolence', artist: 'Lana Del Rey', playlist: 'in my feelings', plays: 9, tag: 'alternative'},
    {title: 'Diet Mountain Dew', artist: 'Lana Del Rey', playlist: "pre's", plays: 8, tag: 'indie-pop'},
    {title: '13 Beaches', artist: 'Lana Del Rey', playlist: 'somewhere else', plays: 4, tag: 'dream-pop'},
    {title: 'West Coast', artist: 'Lana Del Rey', playlist: 'on repeat', plays: 14, tag: 'alternative'},
    {title: 'Tomorrow Never Came', artist: 'Lana Del Rey ft. Sean Ono Lennon', playlist: 'in my feelings', plays: 3, tag: 'indie'},
    {title: 'Doin’ Time', artist: 'Lana Del Rey', playlist: 'on repeat', plays: 10, tag: 'alternative'},
    {title: 'Radio', artist: 'Lana Del Rey', playlist: "pre's", plays: 7, tag: 'alternative'},
    {title: 'Ocean Waves for Sleep', artist: 'Relaxing White Noise', playlist: 'Added this week', plays: 12, tag: 'white-noise'},
    {title: 'Cornfield Chase', artist: 'Hans Zimmer', playlist: 'Added this week', plays: 2, tag: 'soundtrack'},
    {title: 'Love Song', artist: 'Lana Del Rey', playlist: 'in my feelings', plays: 6, tag: 'dream-pop'},
    {title: 'Venice Bitch', artist: 'Lana Del Rey', playlist: 'somewhere else', plays: 5, tag: 'psychedelic'},
    {title: 'Brooklyn Baby', artist: 'Lana Del Rey', playlist: 'on repeat', plays: 12, tag: 'alternative'},
    {title: 'National Anthem', artist: 'Lana Del Rey', playlist: "pre's", plays: 4, tag: 'alternative'},
    {title: 'SexyBack', artist: 'Justin Timberlake', playlist: "pre's", plays: 9, tag: 'pop'},
    {title: 'Rock Your Body', artist: 'Justin Timberlake', playlist: "pre's", plays: 7, tag: 'r&b'},
    {title: 'You', artist: 'Lloyd', playlist: "pre's", plays: 8, tag: 'r&b'},
    {title: 'A Walk', artist: 'Tycho', playlist: 'Added this week', plays: 2, tag: 'electronic'},
    {title: 'Gymnopédie No. 1', artist: 'Erik Satie', playlist: 'Added this week', plays: 2, tag: 'classical'},
    {title: 'Get It Shawty', artist: 'Lloyd', playlist: "pre's", plays: 6, tag: 'r&b'},
    {title: 'Like You', artist: 'Bow Wow ft. Ciara', playlist: "pre's", plays: 5, tag: 'hip-hop'},
    {title: 'Take Five', artist: 'The Dave Brubeck Quartet', playlist: 'Added this week', plays: 1, tag: 'jazz'},
    {title: 'Promiscuous', artist: 'Nelly Furtado ft. Timbaland', playlist: "pre's", plays: 11, tag: 'pop'},
    {title: 'Too Many Nights', artist: 'Metro Boomin ft. Don Toliver & Future', playlist: "pre's", plays: 8, tag: 'trap'},
    {title: 'WAIT FOR U', artist: 'Future ft. Drake & Tems', playlist: "pre's", plays: 6, tag: 'melodic-rap'},
    {title: 'One Dance', artist: 'Drake ft. Wizkid & Kyla', playlist: 'afrobeats', plays: 10, tag: 'afrobeats'},
    {title: 'Soweto', artist: 'Victony & Tempoe', playlist: 'afrobeats', plays: 7, tag: 'afrobeats'},
    {title: 'Mnike', artist: 'Tyler ICU, Tumelo.za & others', playlist: 'afrobeats', plays: 9, tag: 'amapiano'},
    {title: 'Last Last', artist: 'Burna Boy', playlist: 'afrobeats', plays: 12, tag: 'afrobeats'},
    {title: 'Peru', artist: 'Fireboy DML', playlist: 'afrobeats', plays: 8, tag: 'afropop'},
    {title: 'Essence', artist: 'Wizkid ft. Tems', playlist: 'afrobeats', plays: 11, tag: 'afrobeats'},
    {title: 'Snooze', artist: 'SZA', playlist: 'in my feelings', plays: 8, tag: 'r&b'},
    {title: 'Wicked Games', artist: 'The Weeknd', playlist: 'in my feelings', plays: 10, tag: 'alternative-r&b'},
    {title: 'Call Out My Name', artist: 'The Weeknd', playlist: 'in my feelings', plays: 7, tag: 'r&b'},
    {title: 'Persian Rugs', artist: 'PARTYNEXTDOOR', playlist: 'in my feelings', plays: 6, tag: 'alternative-r&b'},
    {title: 'The Knowing', artist: 'The Weeknd', playlist: 'somewhere else', plays: 5, tag: 'alternative-r&b'},
    {title: 'Apocalypse', artist: 'Cigarettes After Sex', playlist: 'somewhere else', plays: 9, tag: 'dream-pop'},
    {title: 'Softcore', artist: 'The Neighbourhood', playlist: 'somewhere else', plays: 7, tag: 'indie'},
    {title: 'Pink + White', artist: 'Frank Ocean', playlist: 'on repeat', plays: 13, tag: 'alternative-r&b'},
    {title: 'Passionfruit', artist: 'Drake', playlist: 'on repeat', plays: 9, tag: 'r&b'},
    {title: 'Girls Need Love', artist: 'Summer Walker', playlist: 'in my feelings', plays: 6, tag: 'r&b'}
    ];


//script for what the responder should say back ... also fake 
//right so were gonna misinterepret the relaxing white noise  music as smth you love and want mpre of
export const Script = {
    profile: [
        'Listens to mostly alternative and R&B music',
        'Likes listening to Afrobeats and Afropop',
        'Preference for classical, instrumental and ambient music',
        'Enjoys a mix of 2000s R&B, hip-hop and contemporary rap',
        'Open to exploring different genres, including jazz, indie and electronic music'
    ],
    newLine: 'Recently started listening to ambient and instrumental music',
    ambientRewrite: 'Growing preference for ambient music ',
    ambientOriginal: 'Preference for classical, instrumental and ambient music',

};

