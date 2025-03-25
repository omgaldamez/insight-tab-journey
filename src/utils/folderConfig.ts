// folderConfig.ts - Configuration for data folders
// Add or remove folders from this list to match your src-data directory structure

export interface FolderInfo {
  id: string;       // Lowercase ID used internally
  name: string;     // Display name (with correct casing)
  description: string; // Description for the folder
  authors: string; // Authors for the folder
  url?: string;     // Website URL (optional)
}
  
  export const dataFolders: FolderInfo[] = [
    {
      id: "Movies",
      name: "Movies",
      description: "Network visualization for Movies dataset",
      authors: "Maria Castañeda\nAlexa Manzano\nAna Mayo\nAnabella Reyes",
      url: "https://www.canva.com/design/DAGirVZ1zgs/epcEAuQMRZCsbK-fm3LJ0Q/view?utm_content=DAGirVZ1zgs&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hc4785fec00"
    },
    {
      id: "Artists",
      name: "Artists",
      description: "Network visualization for Artists dataset",
      authors: "Santiago Capote\nDiego Díaz",
      url: "https://www.canva.com/design/DAGiYX3Zs80/Yo4ZVk-KpYuUvAS9e6tUIA/view?utm_content=DAGiYX3Zs80&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h03aa8331a4"
    },
    {
      id: "Conciertos",
      name: "Conciertos",
      description: "Network visualization for Conciertos dataset",
      authors: "Isabel Lorenzo\nLinda Romano\nAna Paola Suastegui\nSantiago Arreola",
      url: "https://www.canva.com/design/DAGiYZhU-nU/EHuBBtsnSxSZD3d7LuUtcQ/view?utm_content=DAGiYZhU-nU&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hee17f4282b"
    },
    {
      id: "Juguetes",
      name: "Juguetes",
      description: "Network visualization for Juguetes dataset",
      authors: "Nury Gracía\nValeria Heredia\nClaudia Rios",
      url: "https://www.canva.com/design/DAGiYM9S-Zc/D28pfbOkcgaLUqS35n8iDA/view?utm_content=DAGiYM9S-Zc&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hf3777cfc01"
    },
    {
      id: "Cocina",
      name: "Cocina",
      description: "Network visualization for Cocina dataset",
      authors: "Ainne Tello\nKarla Gutiérrez\nRegina Franco\nCamila Millán",
      url: "https://www.canva.com/design/DAGhp6jXL0Q/Ek4ZSnwxk0Hiwj-mQBe_zQ/view?utm_content=DAGhp6jXL0Q&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h70f146a6da"
    },
    {
      id: "TasteAtlas",
      name: "TasteAtlas",
      description: "Network visualization for TasteAtlas dataset",
      authors: "Elaborado en Clase",
      url: "https://www.canva.com/design/DAGfqLwy0QY/C3iiUOpomRpN6FhhezulQQ/view?utm_content=DAGfqLwy0QY&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h8cef313fdf"
    }
  ];
  
  

    // Add more folders as needed
    // {
    //   id: "folder-id",  
    //   name: "Folder Name",
    //   description: "Description of the folder"
    // }
  
  // Demo folders (can be kept as is)
  export const demoFolders: FolderInfo[] = [
    {
      id: "social-network",
      name: "Social Network Demo",
      description: "A sample social network with individuals and their connections",
      authors:"hola"
    },
    {
      id: "scientific-citations",
      name: "Scientific Citations",
      description: "Academic paper citation network with research categories",
      authors:"hola"
    },
    {
      id: "character-network",
      name: "Movie Characters",
      description: "Network of movie characters and their interactions",
      authors:"hola"
    }
  ];