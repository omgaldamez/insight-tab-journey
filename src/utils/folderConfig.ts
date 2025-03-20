// folderConfig.ts - Configuration for data folders
// Add or remove folders from this list to match your src-data directory structure

export interface FolderInfo {
    id: string;       // Lowercase ID used internally
    name: string;     // Display name (with correct casing)
    description: string; // Description for the folder
    authors: string; // Description for the folder
  }
  
  export const dataFolders: FolderInfo[] = [
    {
      id: "Movies",
      name: "Movies",
      description: "Network visualization for Movies dataset",
      authors: "Maria Castañeda\nAlexa Manzano\nAna Mayo\nAnabella Reyes"
    },
    {
      id: "Artists",
      name: "Artists",
      description: "Network visualization for Artists dataset",
      authors: "Santiago Capote\nDiego Díaz"
    },
    {
      id: "Conciertos",
      name: "Conciertos",
      description: "Network visualization for Conciertos dataset",
      authors: "Isabel Lorenzo\nLinda Romano\nAna Paola Suastegui\nSantiago Arreola"
    },
    {
      id: "Juguetes",
      name: "Juguetes",
      description: "Network visualization for Juguetes dataset",
      authors: "Nury Gracía\nValeria Heredia\nClaudia Rios"
    },
    {
      id: "Cocina",
      name: "Cocina",
      description: "Network visualization for Cocina dataset",
      authors: "Ainne Tello\nKarla Gutiérrez\nRegina Franco\nCamila Millán"
    },
    {
      id: "TasteAtlas",
      name: "TasteAtlas",
      description: "Network visualization for TasteAtlas dataset",
      authors: "Elaborado en Clase"
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